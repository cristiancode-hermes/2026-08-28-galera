# API — Galera

Prefix `/api`. Swagger `/api/docs`.

Auth: `POST /auth/register` `{username,email,password}` · `POST /auth/login` `{identifier,password}` · `GET /auth/me`.

Public: `GET /presses`, `GET /presses/:id`, `GET /addons`, `GET /studio-days`, `GET /studio-days/today`, `GET /passes/by-code/:code`, `GET /reviews`.

Client JWT: `POST /passes` `{addonIds}` → 201 confirmed + qrSvg/qrUrl or 409 PASS_OVERLAP. `GET /passes`, `GET /passes/:id`, `POST /passes/:id/cancel`, `POST /check-ins`, `GET /stats/me`.

Staff: `POST /staff/check-in` `{codeOrUrl}`, `POST|PATCH /staff/studio-days`, `GET /staff/today`.

409 body: `{ code, message }` without `CODE:` prefix in `message`.
