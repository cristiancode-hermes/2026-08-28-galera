import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Addon, CheckIn, Pass, PassLine, Press, Review, StudioDay, User } from '../entities/entities';
import { StudioService, BASE_PASS_CENTS, POINTS_PER_STAMP } from '../studio/studio.service';
import { addMadridDays, madridToday } from '../common/time';
import { buildPassQrSvg, makeCode, passUrl } from '../common/qr';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Press) private readonly presses: Repository<Press>,
    @InjectRepository(Addon) private readonly addons: Repository<Addon>,
    @InjectRepository(Pass) private readonly passes: Repository<Pass>,
    @InjectRepository(PassLine) private readonly lines: Repository<PassLine>,
    @InjectRepository(StudioDay) private readonly days: Repository<StudioDay>,
    @InjectRepository(CheckIn) private readonly checkIns: Repository<CheckIn>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    private readonly studio: StudioService,
  ) {}

  async onModuleInit() {
    if (process.env.SEED_DB === 'false') return;
    await this.seed();
  }

  async seed() {
    if (await this.users.count()) {
      await this.studio.seedCalendarIfNeeded();
      return { ok: true, skipped: true };
    }

    const hash = await bcrypt.hash('galera123', 10);
    const ines = (await this.users.save({
      username: 'ines',
      email: 'ines@galera.test',
      passwordHash: hash,
      role: 'client',
    } as any)) as User;
    const staff = (await this.users.save({
      username: 'staff',
      email: 'staff@galera.test',
      passwordHash: hash,
      role: 'staff',
    } as any)) as User;
    void staff;

    const pressDefs = [
      {
        slug: 'vandercook-sp15',
        name: 'Vandercook SP15',
        format: '38×50 cm',
        status: 'ready' as const,
        photoUrl: '/assets/press-vandercook.svg',
        typeNotes: { inks: ['carmín', 'negro'], papers: ['algodón 250 g'] },
        sortOrder: 1,
      },
      {
        slug: 'chandler-price-8x12',
        name: 'Chandler & Price 8×12',
        format: '20×30 cm',
        status: 'ready' as const,
        photoUrl: '/assets/press-platen.svg',
        typeNotes: { inks: ['carmín'], papers: ['tarjeta 300 g'] },
        sortOrder: 2,
      },
      {
        slug: 'washington-hoe',
        name: 'Washington Hoe',
        format: '56×76 cm',
        status: 'ready' as const,
        photoUrl: '/assets/press-washington.svg',
        typeNotes: { inks: ['negro', 'sepia'], papers: ['algodonado 180 g'] },
        sortOrder: 3,
      },
      {
        slug: 'adana-8x5',
        name: 'Adana 8×5',
        format: '13×20 cm',
        status: 'maintenance' as const,
        photoUrl: '/assets/press-adana.svg',
        typeNotes: { inks: ['prueba'], papers: ['sobras'] },
        sortOrder: 4,
      },
    ];
    const presses: Press[] = [];
    for (const def of pressDefs) {
      presses.push((await this.presses.save(def as any)) as Press);
    }

    const addonDefs = [
      { slug: 'ink-carmine', name: 'Tinta carmín', priceCents: 600, active: true },
      { slug: 'paper-cotton', name: 'Papel algodón', priceCents: 800, active: true },
      { slug: 'type-case', name: 'Caja de tipos', priceCents: 1200, active: true },
    ];
    for (const def of addonDefs) {
      await this.addons.save(def as any);
    }

    const today = madridToday();
    for (let i = -2; i <= 13; i++) {
      const date = addMadridDays(today, i);
      await this.days.save({ date, open: i !== -1, capacity: 12 } as any);
    }

    const startsOn = addMadridDays(today, -2);
    const endsOn = addMadridDays(startsOn, 6);
    const extra = await this.addons.findOne({ where: { slug: 'ink-carmine' } });
    const lineDefs = [
      { addonId: null as string | null, label: 'Bono 7 días', amountCents: BASE_PASS_CENTS },
      {
        addonId: extra?.id || null,
        label: extra?.name || 'Tinta carmín',
        amountCents: extra?.priceCents || 600,
      },
    ];
    const totalCents = lineDefs.reduce((s, l) => s + l.amountCents, 0);
    const code = makeCode();
    const qrUrl = passUrl(code);
    const qrSvg = await buildPassQrSvg(qrUrl, code);
    const pass = (await this.passes.save({
      userId: ines.id,
      code,
      status: 'confirmed',
      startsOn,
      endsOn,
      totalCents,
      qrSvg,
      qrUrl,
    } as any)) as Pass;
    for (const def of lineDefs) {
      await this.lines.save({ passId: pass.id, ...def } as any);
    }

    const d0 = await this.days.findOne({ where: { date: startsOn } });
    const d1 = await this.days.findOne({ where: { date: addMadridDays(startsOn, 1) } });
    if (d0) {
      await this.checkIns.save({
        userId: ines.id,
        passId: pass.id,
        studioDayId: d0.id,
        checkInDate: startsOn,
        status: 'checked_in',
        source: 'self',
      } as any);
    }
    if (d1) {
      await this.checkIns.save({
        userId: ines.id,
        passId: pass.id,
        studioDayId: d1.id,
        checkInDate: addMadridDays(startsOn, 1),
        status: 'checked_in',
        source: 'staff',
      } as any);
    }

    await this.reviews.save({
      userId: ines.id,
      pressId: presses[0].id,
      rating: 5,
      body: 'La SP15 tira limpio el 38×50. El cilindro no muerde el papel.',
    } as any);

    const stamps = 2;
    return {
      ok: true,
      demo: 'ines@galera.test / galera123',
      staff: 'staff@galera.test / galera123',
      points: stamps * POINTS_PER_STAMP,
    };
  }
}
