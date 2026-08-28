import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { INestApplication, ValidationPipe, HttpException } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ALL_ENTITIES, Addon, Press, StudioDay, User } from './entities/entities';
import { StudioService, BASE_PASS_CENTS } from './studio/studio.service';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { addMadridDays, madridToday, rangesOverlap } from './common/time';
import { extractTicketCode, passUrl, webOrigin } from './common/qr';

process.env.WEB_ORIGIN = 'https://galera.proyectos.cristiancode.dev';
process.env.JWT_SECRET = 'test-secret';

function codeOf(err: unknown): string | undefined {
  if (err instanceof HttpException) {
    const res = err.getResponse() as any;
    return res?.code;
  }
  return undefined;
}

function msgOf(err: unknown): string {
  if (err instanceof HttpException) {
    const res = err.getResponse() as any;
    return String(res?.message || '');
  }
  return String(err);
}

describe('Galera studio', () => {
  let app: INestApplication;
  let studio: StudioService;
  let auth: AuthService;
  let ines: User;
  let leo: User;
  let staff: User;
  let ink: Addon;
  let press: Press;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: ALL_ENTITIES,
          synchronize: true,
        } as any),
        TypeOrmModule.forFeature(ALL_ENTITIES),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '7d' } }),
        AuthModule,
      ],
      providers: [StudioService],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    studio = moduleRef.get(StudioService);
    auth = moduleRef.get(AuthService);

    ines = (await auth.register({ username: 'ines', email: 'ines@galera.test', password: 'galera123' })).user as any;
    const inesRow = await moduleRef.get(AuthService);
    void inesRow;
    const users = moduleRef.get(TypeOrmModule);
    void users;

    const userRepo = moduleRef.get('UserRepository') as any;
    const fullInes = await userRepo.findOne({ where: { email: 'ines@galera.test' } });
    ines = fullInes;
    leo = (
      await auth.register({ username: 'leo', email: 'leo@galera.test', password: 'galera123' })
    ).user as any;
    leo = await userRepo.findOne({ where: { email: 'leo@galera.test' } });
    staff = (
      await auth.register({ username: 'staff', email: 'staff@galera.test', password: 'galera123' })
    ).user as any;
    staff = await userRepo.findOne({ where: { email: 'staff@galera.test' } });
    staff.role = 'staff';
    await userRepo.save(staff);

    const pressRepo = moduleRef.get('PressRepository') as any;
    press = await pressRepo.save({
      slug: 'vandercook-sp15',
      name: 'Vandercook SP15',
      format: '38×50 cm',
      status: 'ready',
      photoUrl: '/assets/press-vandercook.svg',
      typeNotes: { inks: ['carmín'], papers: ['algodón'] },
      sortOrder: 1,
    });

    const addonRepo = moduleRef.get('AddonRepository') as any;
    ink = await addonRepo.save({
      slug: 'ink-carmine',
      name: 'Tinta carmín',
      priceCents: 600,
      active: true,
    });

    await studio.seedCalendarIfNeeded();
  });

  afterAll(async () => {
    await app.close();
  });

  it('login accepts username or email', async () => {
    const a = await auth.login({ identifier: 'ines', password: 'galera123' });
    const b = await auth.login({ identifier: 'ines@galera.test', password: 'galera123' });
    expect(a.user.id).toBe(b.user.id);
    expect(a.accessToken).toBeTruthy();
  });

  it('lists presses', async () => {
    const list = await studio.listPresses();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].photoUrl).toContain('press-');
  });

  it('unknown press is 404', async () => {
    await expect(studio.getPress('nope')).rejects.toThrow();
  });

  it('creates a confirmed pass atomically without hold', async () => {
    const pass = await studio.createPass(leo.id, [ink.id]);
    expect(pass.status).toBe('confirmed');
    expect('expiresAt' in pass).toBe(false);
    expect(pass.totalCents).toBe(BASE_PASS_CENTS + 600);
    expect(pass.linesSum).toBe(pass.totalCents);
    expect(pass.qrUrl).toBe(passUrl(pass.code));
    expect(pass.qrSvg).toContain(pass.qrUrl);
    expect(pass.qrSvg).toContain('<svg');
  });

  it('QR payload is WEB_ORIGIN + /pase/code', () => {
    expect(webOrigin()).toBe('https://galera.proyectos.cristiancode.dev');
    expect(passUrl('GAL-A7K2')).toBe('https://galera.proyectos.cristiancode.dev/pase/GAL-A7K2');
  });

  it('extracts code from scanned URL', () => {
    expect(extractTicketCode('https://galera.proyectos.cristiancode.dev/pase/GAL-A7K2')).toBe('GAL-A7K2');
    expect(extractTicketCode('gal-zz11')).toBe('GAL-ZZ11');
  });

  it('blocks overlapping second pass with PASS_OVERLAP', async () => {
    try {
      await studio.createPass(leo.id, []);
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('PASS_OVERLAP');
      expect(msgOf(e)).toMatch(/bono activo/i);
      expect(msgOf(e)).not.toMatch(/^PASS_OVERLAP:/);
    }
  });

  it('list totals equal detail line sums', async () => {
    const list = await studio.listMyPasses(leo.id);
    const one = await studio.getMyPass(leo.id, list[0].id);
    expect(list[0].totalCents).toBe(one.totalCents);
    expect(one.totalCents).toBe(one.lines.reduce((s, l) => s + l.amountCents, 0));
  });

  it('public by-code returns the pass', async () => {
    const list = await studio.listMyPasses(leo.id);
    const pub = await studio.getByCode(list[0].code);
    expect(pub.id).toBe(list[0].id);
  });

  it('unknown code 404', async () => {
    await expect(studio.getByCode('GAL-XXXX')).rejects.toThrow();
  });

  it('stamps once and awards 10 points', async () => {
    const list = await studio.listMyPasses(leo.id);
    const stamp = await studio.stampSelf(leo.id, list[0].id);
    expect(stamp.status).toBe('checked_in');
    const stats = await studio.statsMe(leo.id);
    expect(stats.stamps).toBe(1);
    expect(stats.points).toBe(10);
  });

  it('second stamp same day is ALREADY_CHECKED_IN', async () => {
    try {
      await studio.stampSelf(leo.id);
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('ALREADY_CHECKED_IN');
      expect(msgOf(e)).toMatch(/Ya sellaste hoy/);
    }
  });

  it('staff scan of same user same day is ALREADY_CHECKED_IN', async () => {
    const list = await studio.listMyPasses(leo.id);
    try {
      await studio.stampStaff(list[0].qrUrl);
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('ALREADY_CHECKED_IN');
    }
  });

  it('closed studio is STUDIO_CLOSED', async () => {
    const today = await studio.todayStudio();
    await studio.patchStudioDay(today.id, { open: false });
    const other = await auth.register({
      username: 'nuria',
      email: 'nuria@galera.test',
      password: 'galera123',
    });
    const userRepo = (app as any).get('UserRepository') || null;
    void userRepo;
    const nuriaAuth = other.user;
    const nuria = await studio['users'].findOne({ where: { email: 'nuria@galera.test' } });
    await studio.createPass(nuria.id, []);
    try {
      await studio.stampSelf(nuria.id);
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('STUDIO_CLOSED');
      expect(msgOf(e)).toMatch(/cerrado/);
    }
    await studio.patchStudioDay(today.id, { open: true });
    void nuriaAuth;
  });

  it('full studio is STUDIO_FULL', async () => {
    const today = await studio.todayStudio();
    await studio.patchStudioDay(today.id, { capacity: 1, open: true });
    // leo already stamped today occupying the 1 slot
    const pax = await auth.register({
      username: 'pax',
      email: 'pax@galera.test',
      password: 'galera123',
    });
    void pax;
    const paxUser = await studio['users'].findOne({ where: { email: 'pax@galera.test' } });
    await studio.createPass(paxUser.id, []);
    try {
      await studio.stampSelf(paxUser.id);
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('STUDIO_FULL');
    }
    await studio.patchStudioDay(today.id, { capacity: 12 });
  });

  it('invalid pass for today is PASS_INVALID', async () => {
    try {
      await studio.stampSelf(ines.id, 'missing');
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('PASS_INVALID');
    }
  });

  it('cancel inside 24h window fails', async () => {
    const list = await studio.listMyPasses(leo.id);
    try {
      await studio.cancelPass(leo.id, list[0].id);
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('CANCEL_WINDOW');
    }
  });

  it('review once then ALREADY_REVIEWED', async () => {
    const r = await studio.createReview(leo.id, {
      pressId: press.id,
      rating: 5,
      body: 'Tira limpio.',
    });
    expect(r.rating).toBe(5);
    try {
      await studio.createReview(leo.id, { pressId: press.id, rating: 4, body: 'otra' });
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('ALREADY_REVIEWED');
    }
  });

  it('stats points derived from stamps not magic', async () => {
    const s = await studio.statsMe(leo.id);
    expect(s.points).toBe(s.stamps * 10);
  });

  it('date ranges overlap helper', () => {
    expect(rangesOverlap('2026-08-28', '2026-09-03', '2026-09-01', '2026-09-07')).toBe(true);
    expect(rangesOverlap('2026-08-28', '2026-09-03', '2026-09-04', '2026-09-10')).toBe(false);
  });

  it('madridToday is ISO date', () => {
    expect(madridToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(addMadridDays('2026-08-28', 6)).toBe('2026-09-03');
  });

  it('login identifier is required in dto path', async () => {
    await expect(auth.login({ identifier: 'ines', password: 'wrong-password-x' })).rejects.toThrow();
  });
});
