# Architecture — Galera

Monorepo `apps/api` (NestJS) + `apps/web` (Angular 22). SQLite local, Postgres via `DATABASE_TYPE=postgres`.

Entities: User, Press, Addon, Pass, PassLine, StudioDay, CheckIn, Review.

Value layer: weekly pass (no hold TTL) + one stamp per Madrid civil day + capacity on StudioDay + real QR (`qrcode`) whose payload is `WEB_ORIGIN/pase/:code`.

Auth: JWT via ConfigService, interceptor reads `galera.accessToken` from localStorage only.
