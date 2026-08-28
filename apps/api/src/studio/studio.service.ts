import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  Addon,
  CheckIn,
  Pass,
  PassLine,
  Press,
  Review,
  StudioDay,
  User,
} from '../entities/entities';
import { withLock } from '../common/mutex';
import { conflict } from '../common/http-conflict';
import {
  addMadridDays,
  formatEsDate,
  hoursUntilMidnightMadrid,
  madridToday,
  rangesOverlap,
} from '../common/time';
import { buildPassQrSvg, extractTicketCode, makeCode, passUrl } from '../common/qr';

export const BASE_PASS_CENTS = 4200;
export const POINTS_PER_STAMP = 10;

@Injectable()
export class StudioService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Press) private readonly presses: Repository<Press>,
    @InjectRepository(Addon) private readonly addons: Repository<Addon>,
    @InjectRepository(Pass) private readonly passes: Repository<Pass>,
    @InjectRepository(PassLine) private readonly lines: Repository<PassLine>,
    @InjectRepository(StudioDay) private readonly days: Repository<StudioDay>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  listPresses() {
    return this.presses.find({ order: { sortOrder: 'ASC' } });
  }

  async getPress(id: string) {
    const press = await this.presses.findOne({ where: { id } });
    if (!press) throw new NotFoundException('Esa prensa no está en la galera');
    const reviews = await this.reviews.find({
      where: { pressId: id },
      order: { createdAt: 'DESC' },
    });
    return { ...press, reviews, reviewCount: reviews.length };
  }

  listAddons() {
    return this.addons.find({ where: { active: true } });
  }

  async listStudioDays() {
    const today = madridToday();
    const end = addMadridDays(today, 13);
    const rows = await this.days.find({ order: { date: 'ASC' } });
    return rows.filter((d) => d.date >= today && d.date <= end);
  }

  async todayStudio() {
    const date = madridToday();
    const day = await this.ensureDay(date);
    const occupied = await this.checkIns.count({ where: { studioDayId: day.id } });
    return { date, open: day.open, capacity: day.capacity, occupied, id: day.id };
  }

  async createPass(userId: string, addonIds: string[]) {
    return withLock(() => this.createPassLocked(userId, addonIds || []));
  }

  private async createPassLocked(userId: string, addonIds: string[]) {
    const today = madridToday();
    const startsOn = await this.resolveStartsOn(today);
    const endsOn = addMadridDays(startsOn, 6);

    const existing = await this.passes.find({ where: { userId, status: 'confirmed' } });
    const overlap = existing.find((p) => rangesOverlap(startsOn, endsOn, p.startsOn, p.endsOn));
    if (overlap) {
      conflict('PASS_OVERLAP', `Ya tienes un bono activo hasta el ${formatEsDate(overlap.endsOn)}.`);
    }

    const uniqueIds = [...new Set(addonIds.filter(Boolean))];
    const extras = uniqueIds.length
      ? await this.addons.find({ where: { id: In(uniqueIds), active: true } })
      : [];
    const lineDefs: { addonId: string | null; label: string; amountCents: number }[] = [
      { addonId: null, label: 'Bono 7 días', amountCents: BASE_PASS_CENTS },
    ];
    for (const a of extras) {
      lineDefs.push({ addonId: a.id, label: a.name, amountCents: a.priceCents });
    }
    const totalCents = lineDefs.reduce((s, l) => s + l.amountCents, 0);

    let code = makeCode();
    while (await this.passes.findOne({ where: { code } })) code = makeCode();
    const qrUrl = passUrl(code);
    const qrSvg = await buildPassQrSvg(qrUrl, code);

    const saved = (await this.passes.save({
      userId,
      code,
      status: 'confirmed',
      startsOn,
      endsOn,
      totalCents,
      qrSvg,
      qrUrl,
    } as any)) as Pass;

    for (const def of lineDefs) {
      await this.lines.save({
        passId: saved.id,
        addonId: def.addonId,
        label: def.label,
        amountCents: def.amountCents,
      } as any);
    }

    return this.serializePass(await this.loadPass(saved.id));
  }

  async listMyPasses(userId: string) {
    const rows = await this.passes.find({
      where: { userId },
      relations: { lines: true, checkIns: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((p) => this.serializePass(p));
  }

  async getMyPass(userId: string, id: string) {
    const pass = await this.loadPass(id);
    if (!pass || pass.userId !== userId) throw new NotFoundException('Pase no encontrado');
    return this.serializePass(pass);
  }

  async getByCode(code: string) {
    const pass = await this.passes.findOne({
      where: { code: String(code || '').trim().toUpperCase() },
      relations: { lines: true, checkIns: true },
    });
    if (!pass) throw new NotFoundException('Pase no encontrado');
    return this.serializePass(pass);
  }

  async qrFor(userId: string, id: string) {
    const pass = await this.getMyPass(userId, id);
    return { qrSvg: pass.qrSvg, qrUrl: pass.qrUrl };
  }

  async cancelPass(userId: string, id: string) {
    const pass = await this.loadPass(id);
    if (!pass || pass.userId !== userId) throw new NotFoundException('Pase no encontrado');
    if (pass.status !== 'confirmed') conflict('CANCEL_WINDOW', 'Ya no se puede cancelar este bono.');
    const stamps = (pass.checkIns || []).filter((c) => c.status === 'checked_in').length;
    const hours = hoursUntilMidnightMadrid(pass.startsOn);
    if (stamps > 0 || hours < 24) {
      conflict('CANCEL_WINDOW', 'Ya no se puede cancelar este bono.');
    }
    pass.status = 'cancelled';
    await this.passes.save(pass as any);
    return this.serializePass(await this.loadPass(pass.id));
  }

  async stampSelf(userId: string, passId?: string) {
    return withLock(() => this.stampLocked(userId, passId, 'self'));
  }

  async stampStaff(codeOrUrl: string) {
    const code = extractTicketCode(codeOrUrl);
    const pass = await this.passes.findOne({ where: { code } });
    if (!pass) throw new NotFoundException('Pase no encontrado');
    return withLock(() => this.stampLocked(pass.userId, pass.id, 'staff'));
  }

  private async stampLocked(userId: string, passId: string | undefined, source: 'self' | 'staff') {
    const today = madridToday();
    const already = await this.checkIns.findOne({ where: { userId, checkInDate: today } });
    if (already) conflict('ALREADY_CHECKED_IN', 'Ya sellaste hoy.');

    const day = await this.ensureDay(today);
    if (!day.open) conflict('STUDIO_CLOSED', 'Hoy el taller está cerrado.');
    const occupied = await this.checkIns.count({ where: { studioDayId: day.id } });
    if (occupied >= day.capacity) conflict('STUDIO_FULL', 'El taller está lleno hoy.');

    let pass: Pass | null = null;
    if (passId) {
      pass = await this.passes.findOne({ where: { id: passId, userId } });
    } else {
      const list = await this.passes.find({ where: { userId, status: 'confirmed' } });
      pass = list.find((p) => p.startsOn <= today && p.endsOn >= today) || null;
    }
    if (!pass || pass.status !== 'confirmed' || pass.startsOn > today || pass.endsOn < today) {
      conflict('PASS_INVALID', 'Este pase no vale para hoy.');
    }

    const saved = (await this.checkIns.save({
      userId,
      passId: pass.id,
      studioDayId: day.id,
      checkInDate: today,
      status: 'checked_in',
      source,
    } as any)) as CheckIn;
    return this.serializeCheckIn(saved);
  }

  async myCheckIns(userId: string) {
    const rows = await this.checkIns.find({ where: { userId }, order: { checkInDate: 'DESC' } });
    return rows.map((c) => this.serializeCheckIn(c));
  }

  async upsertStudioDay(dto: { date: string; capacity: number; open: boolean }) {
    let day = await this.days.findOne({ where: { date: dto.date } });
    if (!day) {
      day = (await this.days.save({ date: dto.date, capacity: dto.capacity, open: dto.open } as any)) as StudioDay;
    } else {
      day.capacity = dto.capacity;
      day.open = dto.open;
      await this.days.save(day as any);
    }
    return day;
  }

  async patchStudioDay(id: string, patch: { open?: boolean; capacity?: number }) {
    const day = await this.days.findOne({ where: { id } });
    if (!day) throw new NotFoundException('Día no encontrado');
    if (typeof patch.open === 'boolean') day.open = patch.open;
    if (typeof patch.capacity === 'number') day.capacity = patch.capacity;
    await this.days.save(day as any);
    return day;
  }

  async staffToday() {
    const today = await this.todayStudio();
    const checkIns = today.id
      ? await this.checkIns.find({ where: { studioDayId: today.id }, order: { createdAt: 'DESC' } })
      : [];
    return { studioDay: today, checkIns: checkIns.map((c) => this.serializeCheckIn(c)) };
  }

  async listReviews(pressId?: string) {
    if (pressId) return this.reviews.find({ where: { pressId }, order: { createdAt: 'DESC' } });
    return this.reviews.find({ order: { createdAt: 'DESC' } });
  }

  async createReview(userId: string, dto: { pressId: string; rating: number; body: string }) {
    const press = await this.presses.findOne({ where: { id: dto.pressId } });
    if (!press) throw new NotFoundException('Esa prensa no está en la galera');
    const dup = await this.reviews.findOne({ where: { userId, pressId: dto.pressId } });
    if (dup) conflict('ALREADY_REVIEWED', 'Ya reseñaste esta prensa.');
    const saved = (await this.reviews.save({
      userId,
      pressId: dto.pressId,
      rating: dto.rating,
      body: dto.body.trim(),
    } as any)) as Review;
    return saved;
  }

  async statsMe(userId: string) {
    const stamps = await this.checkIns.count({ where: { userId, status: 'checked_in' } });
    const today = madridToday();
    const passes = await this.passes.find({
      where: { userId, status: 'confirmed' },
      relations: { lines: true, checkIns: true },
    });
    const active = passes.find((p) => p.startsOn <= today && p.endsOn >= today) || null;
    return {
      points: stamps * POINTS_PER_STAMP,
      stamps,
      activePass: active ? this.serializePass(active) : null,
    };
  }

  async seedCalendarIfNeeded() {
    const today = madridToday();
    for (let i = -2; i <= 13; i++) {
      const date = addMadridDays(today, i);
      const exists = await this.days.findOne({ where: { date } });
      if (exists) continue;
      const open = i !== -1;
      await this.days.save({ date, open, capacity: 12 } as any);
    }
  }

  private async resolveStartsOn(today: string): Promise<string> {
    const day = await this.ensureDay(today);
    if (day.open) return today;
    const upcoming = await this.days.find({ order: { date: 'ASC' } });
    const next = upcoming.find((d) => d.date > today && d.open);
    return next?.date || addMadridDays(today, 1);
  }

  private async ensureDay(date: string): Promise<StudioDay> {
    let day = await this.days.findOne({ where: { date } });
    if (!day) {
      day = (await this.days.save({ date, open: true, capacity: 12 } as any)) as StudioDay;
    }
    return day;
  }

  private async loadPass(id: string): Promise<Pass | null> {
    return this.passes.findOne({
      where: { id },
      relations: { lines: true, checkIns: true },
    });
  }

  serializePass(pass: Pass) {
    const lines = [...(pass.lines || [])];
    const lineSum = lines.reduce((s, l) => s + l.amountCents, 0);
    const stamps = (pass.checkIns || []).filter((c) => c.status === 'checked_in');
    return {
      id: pass.id,
      userId: pass.userId,
      code: pass.code,
      status: pass.status,
      startsOn: pass.startsOn,
      endsOn: pass.endsOn,
      totalCents: pass.totalCents,
      linesSum: lineSum,
      qrSvg: pass.qrSvg,
      qrUrl: pass.qrUrl,
      createdAt: pass.createdAt,
      lines: lines.map((l) => ({
        id: l.id,
        addonId: l.addonId,
        label: l.label,
        amountCents: l.amountCents,
      })),
      stamps: stamps.map((c) => this.serializeCheckIn(c)),
      stampCount: stamps.length,
      points: stamps.length * POINTS_PER_STAMP,
    };
  }

  serializeCheckIn(c: CheckIn) {
    return {
      id: c.id,
      userId: c.userId,
      passId: c.passId,
      studioDayId: c.studioDayId,
      checkInDate: c.checkInDate,
      status: c.status,
      source: c.source,
      createdAt: c.createdAt,
    };
  }
}
