export const API = '/api';
export const TOKEN_KEY = 'galera.accessToken';
export const THEME_KEY = 'galera.theme';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'client' | 'staff' | 'admin';
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Press {
  id: string;
  slug: string;
  name: string;
  format: string;
  status: 'ready' | 'maintenance';
  photoUrl: string;
  typeNotes: { inks: string[]; papers: string[] };
  sortOrder: number;
  reviews?: Review[];
  reviewCount?: number;
}

export interface Addon {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  active: boolean;
}

export interface PassLine {
  id: string;
  addonId: string | null;
  label: string;
  amountCents: number;
}

export interface CheckIn {
  id: string;
  userId: string;
  passId: string;
  studioDayId: string;
  checkInDate: string;
  status: 'checked_in';
  source: 'self' | 'staff';
}

export interface Pass {
  id: string;
  userId: string;
  code: string;
  status: 'confirmed' | 'cancelled' | 'expired';
  startsOn: string;
  endsOn: string;
  totalCents: number;
  linesSum?: number;
  qrSvg: string;
  qrUrl: string;
  lines: PassLine[];
  stamps: CheckIn[];
  stampCount: number;
  points: number;
}

export interface StudioToday {
  id: string;
  date: string;
  open: boolean;
  capacity: number;
  occupied: number;
}

export interface Review {
  id: string;
  userId: string;
  pressId: string;
  rating: number;
  body: string;
}

export interface MeStats {
  points: number;
  stamps: number;
  activePass: Pass | null;
}

export function euros(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function humanizeApiError(err: unknown, fallback = 'No se pudo completar.'): string {
  const body = (err as { error?: any })?.error;
  const code = body?.code || (typeof body?.message === 'string' && body.message.includes(':')
    ? body.message.split(':')[0]
    : '');
  const raw =
    typeof body?.message === 'string'
      ? body.message
      : typeof body?.message?.message === 'string'
        ? body.message.message
        : '';
  const stripped = raw.replace(/^[A-Z_]+:\s*/, '');
  if (stripped && !/^[A-Z_]+$/.test(stripped)) return stripped;
  const map: Record<string, string> = {
    PASS_OVERLAP: 'Ya tienes un bono activo.',
    ALREADY_CHECKED_IN: 'Ya sellaste hoy.',
    STUDIO_CLOSED: 'Hoy el taller está cerrado.',
    STUDIO_FULL: 'El taller está lleno hoy.',
    PASS_INVALID: 'Este pase no vale para hoy.',
    CANCEL_WINDOW: 'Ya no se puede cancelar este bono.',
    ALREADY_REVIEWED: 'Ya reseñaste esta prensa.',
  };
  return map[code] || fallback;
}
