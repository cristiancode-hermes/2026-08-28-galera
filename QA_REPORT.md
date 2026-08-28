# QA Report — 2026-08-28 Galera

**Project:** Taller letterpress B2C — bono de 7 días, sello diario y QR de umbral  
**Stack:** Angular 22 (signals, zoneless) + NestJS 11 + TypeORM + SQLite  
**Author:** Hermes Daily Builder  
**Port / slug:** 3077 / `galera`  
**Design lock:** DESIGN_FREE (`isFinalDesign.true` ausente)

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API `tsc -p tsconfig.json --incremental false` | ✅ | `apps/api/dist/main.js` |
| Web `ng build --configuration=production` | ✅ | `apps/web/dist/web/browser/index.html` · `<base href="/">` |
| Tailwind v4 preprocess | N/A | CSS propio (Carmesí de Caja), no `@import "tailwindcss"` |

## ✅ 2. Test Results

22 test cases · Jest (`galera.spec.ts`) — ALL PASSED

| Suite | Cases |
|-------|--------|
| Galera studio | 22/22: login username/email, presses, pass atómico sin hold, QR URL en SVG, PASS_OVERLAP, lista↔detalle, by-code, puntos 10/sello, ALREADY_CHECKED_IN self+staff, STUDIO_CLOSED, STUDIO_FULL, PASS_INVALID, CANCEL_WINDOW, ALREADY_REVIEWED, overlap helper, madridToday |

New tests: existing coverage adequate (≥18 requeridos).

## ✅ 3. Binary / Runtime Verification

Endpoint smoke (curl file-based, 34/34 PASS) contra `http://localhost:3077`:

| Check | Result |
|-------|--------|
| GET `/api/presses`, `/api/addons`, `/api/studio-days/today` | 200 |
| Login email + username (`ines` / `ines@galera.test`) | 201 + `accessToken` |
| GET `/api/auth/me` | 200 `{ user }` |
| Lista ↔ detalle totales | 4800 = 4800 = Σ PassLine; puntos 20 = 2×10 |
| GET público `/api/passes/by-code/:code` | 200 |
| QR real | `qrUrl` = `https://galera.proyectos.cristiancode.dev/pase/GAL-8DUS` contenido en SVG |
| POST segundo bono | 409 `PASS_OVERLAP` mensaje humano (sin `PASS_OVERLAP:`) |
| POST sello 2.º | 409 `ALREADY_CHECKED_IN` «Ya sellaste hoy.» |
| Staff scan URL | 409 ALREADY_CHECKED_IN |
| Register DTO `username+email+password` | 201 |
| Stats points = stamps×10 | 3 / 30 |
| Sin token `/api/passes` | 401 |
| Swagger `/api/docs-json` | 200 |

Browser (Puppeteer, 17/17 PASS) sobre el subdominio live:

home, /prensas, `/prensas/:id`, login vacío + demo debajo, JWT `galera.accessToken`, /mi-pase, `/mi-pase/:id`, QR visible, /sello, /entrar, /registro, `/pase/:code` público + QR, contraste-hover, 390px sin overflow, consola limpia.

## ✅ 4. Quality Audit

| Criterion | Verdict | Notes |
|-----------|---------|-------|
| Capa de valor de verdad | PASS | Bono calendario + sello 1/día + aforo StudioDay (no CRUD vacío) |
| Loop hueco+hold+QR | N/A (prohibido hoy) | Núcleo **bono-checkin**; sin `expiresAt` de hold 15 min |
| QR real (regla 2026-08-24) | PASS | `qrcode` SVG, payload URL absoluta `/pase/:code`, `bypassSecurityTrustHtml` |
| Auth ANTES de `**` | PASS | `/login` `/registro` `/entrar` fuera del shell |
| Login username OR email | PASS | identifier; creds demo debajo; inputs vacíos; autocomplete off |
| TOKEN_KEY namespaced | OK | `galera.accessToken`; registrado en prod-capture (ambos bloques) |
| 409 humano junto al CTA | PASS | `humanizeApiError` + `#pass-action` / `#stamp-action` |
| Empty/error = pantallas | PASS | state-screen + CTA reintentar |
| Totales lista ↔ detalle | PASS | mismas PassLine |
| Gráficos | N/A | App B2C sin dashboard de charts |
| Fotos del vertical | PASS (tras fix) | SVG prensas; Chandler `&` sin escapar rompía el XML |
| Theme toggle sol/luna | PASS | `aria-label`, sin texto Claro/Oscuro |
| Card hover lift | PASS | borde + surface-2 + translateY |
| contraste-hover (2026-08-19) | PASS (tras fix) | ver abajo |
| Zoneless | PASS | `provideZonelessChangeDetection`, sin zone.js |

### Contraste-hover

Light: on-primary `#FFFFFF` / primary `#8E1C28` = **8.95:1**; hover `#6F151E` = **11.65:1**.  
Dark original `#161412` sobre `#C45A5A` = **4.34:1** FAIL; hover `#A83F3F` = **3.02:1** FAIL (zona media).  
Fix a11y (no rediseño): dark primary `#C14A4A` + on-primary `#FFFFFF` → **4.83:1** / hover **6.09:1**.  
`a:hover:not(.btn)` ya excluía `.btn`.

### Minor Issues

| Issue | Severity | Suggestion |
|-------|----------|------------|
| `#hold-action` vs `#pass-action` | info | Dominio sin hold; mensaje sigue junto al CTA |
| SVG ilustración (no foto) | info | Vertical letterpress cubierto; no stock gym/hielo |

### Fixes applied during QA

1. Dark CTA contrast AA (`styles.css`).
2. Ampersand XML en `press-platen.svg` (Chandler no pintaba).

## ✅ 5. Security Scan

| Check | Result |
|-------|--------|
| `***` interceptor | 0 matches en src |
| JWT Bearer concat | `'Bearer ' + token` |
| APP_GUARD global | no |
| Prefijo `api/api` | no (`@Controller('auth')` + global `api`) |
| Register DTO whitelist | username, email, password |
| `.env` gitignored | sí |
| Secrets en repo | no |

## ✅ 6. Deployment

| Target | Result | Details |
|--------|--------|---------|
| Caddy | ✅ | `galera.proyectos.cristiancode.dev` → dist + reverse_proxy :3077 · HTTP 200 · LE OK |
| API | ✅ | :3077 seed `ines@galera.test` / `galera123` |
| manage-apis.sh | ✅ | PORTS/NAMES/DIRS alineados idx 61 → 3077 / galera / 2026-08-28-galera |
| GitHub | ✅ | https://github.com/cristiancode-hermes/2026-08-28-galera README 200 |
| Excel | ✅ | fila 94 · `08-28-galera` · puerto 3077 |
| Landing | ✅ | `{name:'galera'}` en proyectos-cristiancode-dev (pushed) |
| Portfolio es/en/pt | ✅ | slug `galera`, id heading-235, date 2026-08-28 |
| Capture config | ✅ | config.mjs + prod-capture slug map + `galera.accessToken` |
| Screenshots | ✅ | `/assets/galera.png` + `galera-m.png` (captura real home) |

### Link verification

| Link | HTTP |
|------|------|
| href https://galera.proyectos.cristiancode.dev | 200 |
| /login /prensas/:id /pase/:code | 200 |
| /api/presses (vía Caddy) | 200 |
| link2 README blob | 200 |
| link3 repo | 200 |

## Summary

**OVERALL: PASS ✅**

Demo: `ines@galera.test` / `galera123` · staff `staff@galera.test` / `galera123`  
Live: https://galera.proyectos.cristiancode.dev  
QR real: sí \| url: `/pase/:code`
