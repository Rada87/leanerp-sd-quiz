# LeanERP SD Quiz

Kvízová aplikace pro Škoda / LeanERP Service Desk. React 19 + TypeScript + Vite frontend, malý Node/Express backend s vlastní SQLite databází, vše v jednom Docker containeru.

## Příkazy

| Příkaz | Popis |
|---|---|
| `npm install` | Nainstaluje závislosti (spustit po klonování) |
| `npm run dev` | Spustí vývojový server na http://localhost:5173 (proxuje `/api` na backend na :3000) |
| `npm run server` | Spustí backend (Express + SQLite) na http://localhost:3000, serviruje i `dist/` |
| `npm run build` | Zkompiluje TypeScript a sestaví produkční bundle do `dist/` |
| `npm run start` | `build` + `server` — produkční běh mimo Docker |
| `npm run preview` | Lokálně zobrazí produkční build (po `npm run build`) |
| `npm run lint` | Spustí ESLint kontrolu kódu |

## Architektura

- `src/` — React SPA, viz `CLAUDE.md` pro detaily.
- `server/` — Express API (`/api/scores`, `/api/questions`) + servírování statického `dist/`. Data v SQLite souboru (`better-sqlite3`), cesta dána `DATA_DIR` (default `./data`).
- Frontend mluví s backendem přes relativní `/api/...` fetch, žádné externí služby ani API klíče nejsou potřeba.
- Otázky se při prvním startu naseedují z `dist/questions.json` (bývalá statická sada), pokud je tabulka `questions` prázdná.

## Activity logging

Aplikace ukládá do SQLite anonymní provozní události pro ladění a vyhodnocení eventu. Nezapisuje IP adresy, zadaná jména hráčů, texty otázek ani texty odpovědí. Jedno načtení stránky má náhodné `sessionId`; každá hra má náhodné `quizRunId` a alias `Player_XXXXXX`. U odpovědi se ukládá ID možnosti a písmeno A/B/C/D, aby šlo analyzovat distraktory. Queue `clientId` se nepersistuje.

Activity Report je dostupný přes Settings → Activity Report. Obsahuje návštěvy, starty a dokončení kvízu, completion rate, průměrné skóre a délku, čekání ve frontě, úspěšnost otázek a technické chyby. Odtud lze stáhnout anonymní JSON timeline.

Volitelné proměnné prostředí:

- `EVENT_START_AT` a `EVENT_END_AT` — ISO-8601 hranice pro rozdělení metrik na before/during/after.
- `ACTIVITY_RETENTION_DAYS` — retence událostí; výchozí hodnota je 180 dní, aplikovaná při startu serveru.

API:

- `POST /api/activity` — validovaný, rate-limitovaný a na klientu fail-open ingest známých typů událostí.
- `GET /api/activity/summary` — anonymní agregovaný report; podporuje `from` a `to` v ISO-8601.
- `GET /api/activity/export` — anonymní timeline; podporuje `from`, `to` a `limit` (maximum 50 000).

### Datový slovník

| Oblast | Události | Ukládaná metadata |
|---|---|---|
| Návštěva | `app_opened`, `screen_viewed`, `connectivity_changed` | stav online, viditelnost, předchozí obrazovka |
| Fronta | `queue_state_changed`, `queue_left`, `queue_request_failed` | stav, pozice, počet čekajících, operace/status chyby |
| Kvíz | `quiz_start_requested`, `quiz_started`, `quiz_completed`, `quiz_abandoned` | zda bylo zadáno jméno (pouze boolean), počet otázek, queue režim, agregované skóre, délka, důvod opuštění |
| Otázky | `question_viewed`, `question_answered`, `question_timed_out` | ID/kategorie otázky, index, správnost, body, čas a ID/písmeno zvolené možnosti; nikdy text možnosti |
| Diagnostika | `client_error`, `presentation_sync_failed`, `score_storage_fallback`, `questions_load_failed` | typ/operace, HTTP status a omezená chybová zpráva |
| Admin | `settings_opened`, `leaderboard_viewed`, `activity_report_viewed`, `activity_exported`, `idle_reset` | obrazovka nebo počet exportovaných řádků |

## Lokální běh v Dockeru

```bash
mkdir -p data
docker compose up --build
```

Aplikace poběží na `http://127.0.0.1:8213` (port lze změnit přes `APP_PORT` v `.env`).

## Nasazení na VPS

Server: `srv1848295.hstgr.cloud` (viz `AGENTS.md` v `/Users/radekvesely/Documents/srv1848295 | KVM 2/`).

Struktura na VPS podle konvence:

```
/srv/www/leanerp-sd-quiz/
  app/    ← git clone tohoto repozitáře (obsahuje Dockerfile + docker-compose.yml)
  data/   ← neversionovaná SQLite databáze (bind-mount do containeru)
  .env    ← interní konfigurace (APP_PORT, ...)
```

Postup:

```bash
mkdir -p /srv/www/leanerp-sd-quiz/{data}
cd /srv/www/leanerp-sd-quiz
git clone <repo-url> app
cp app/.env.example .env   # uprav APP_PORT, ať nekoliduje s jinými projekty
cd app
docker compose up -d --build
```

Aktualizace: `cd /srv/www/leanerp-sd-quiz/app && git pull --ff-only && docker compose up -d --build`.

Docker service publikuje pouze na `127.0.0.1:<APP_PORT>` — Nginx na hostu ho zpřístupní na `/apps/leanerp-sd-quiz/`, např.:

```nginx
location /apps/leanerp-sd-quiz/ {
    proxy_pass http://127.0.0.1:8213/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

(Trailing `/` u `proxy_pass` odřízne prefix `/apps/leanerp-sd-quiz/`. Produkční Vite build ale používá stejný prefix pro URL statických souborů a API volání.)

Podrobný postup, veřejné URL a kontrakt API pro prezentaci jsou v [deploy.md](deploy.md).

Nasazení probíhá přímo na VPS příkazem `git pull` + `docker compose up -d --build`; samostatná GitHub Actions konfigurace se nepoužívá.
