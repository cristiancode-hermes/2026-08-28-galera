import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 120 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 16, default: 'client' })
  role: 'client' | 'staff' | 'admin';

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Pass, (p: Pass) => p.user)
  passes?: Pass[];

  @OneToMany(() => CheckIn, (c: CheckIn) => c.user)
  checkIns?: CheckIn[];

  @OneToMany(() => Review, (r: Review) => r.user)
  reviews?: Review[];
}

@Entity({ name: 'presses' })
export class Press {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  format: string;

  @Column({ type: 'varchar', length: 16, default: 'ready' })
  status: 'ready' | 'maintenance';

  @Column({ type: 'varchar' })
  photoUrl: string;

  @Column({ type: 'simple-json' })
  typeNotes: { inks: string[]; papers: string[] };

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => Review, (r: Review) => r.press)
  reviews?: Review[];
}

@Entity({ name: 'addons' })
export class Addon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}

@Entity({ name: 'passes' })
@Index(['userId', 'status'])
export class Pass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, (u: User) => u.passes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar', length: 16, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 16 })
  status: 'confirmed' | 'cancelled' | 'expired';

  @Column({ type: 'date' })
  startsOn: string;

  @Column({ type: 'date' })
  endsOn: string;

  @Column({ type: 'int' })
  totalCents: number;

  @Column({ type: 'text' })
  qrSvg: string;

  @Column({ type: 'varchar' })
  qrUrl: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => PassLine, (l: PassLine) => l.pass)
  lines?: PassLine[];

  @OneToMany(() => CheckIn, (c: CheckIn) => c.pass)
  checkIns?: CheckIn[];
}

@Entity({ name: 'pass_lines' })
export class PassLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  passId: string;

  @ManyToOne(() => Pass, (p: Pass) => p.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'passId' })
  pass?: Pass;

  @Column({ type: 'varchar', nullable: true })
  addonId: string | null;

  @ManyToOne(() => Addon, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'addonId' })
  addon?: Addon | null;

  @Column({ type: 'varchar' })
  label: string;

  @Column({ type: 'int' })
  amountCents: number;
}

@Entity({ name: 'studio_days' })
export class StudioDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date', unique: true })
  date: string;

  @Column({ type: 'boolean', default: true })
  open: boolean;

  @Column({ type: 'int', default: 12 })
  capacity: number;
}

@Entity({ name: 'check_ins' })
@Index(['userId', 'checkInDate'], { unique: true })
export class CheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, (u: User) => u.checkIns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar' })
  passId: string;

  @ManyToOne(() => Pass, (p: Pass) => p.checkIns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'passId' })
  pass?: Pass;

  @Column({ type: 'varchar' })
  studioDayId: string;

  @ManyToOne(() => StudioDay)
  @JoinColumn({ name: 'studioDayId' })
  studioDay?: StudioDay;

  @Column({ type: 'date' })
  checkInDate: string;

  @Column({ type: 'varchar', length: 16, default: 'checked_in' })
  status: 'checked_in';

  @Column({ type: 'varchar', length: 8 })
  source: 'self' | 'staff';

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity({ name: 'reviews' })
@Index(['userId', 'pressId'], { unique: true })
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, (u: User) => u.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar' })
  pressId: string;

  @ManyToOne(() => Press, (p: Press) => p.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pressId' })
  press?: Press;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

export const ALL_ENTITIES = [User, Press, Addon, Pass, PassLine, StudioDay, CheckIn, Review];
