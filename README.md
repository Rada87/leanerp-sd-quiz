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

GitHub Actions (`.github/workflows/ci.yml`) jen lintuje a builduje na push/PR — nasazení je manuální `git pull` + `docker compose up -d --build` na VPS.
