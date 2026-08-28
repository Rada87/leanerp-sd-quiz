# Nasazení Lean ERP SD Quiz

## Veřejné adresy

- Quiz: `https://srv1848295.hstgr.cloud/apps/leanerp-sd-quiz/`
- Veřejný TOP 10 endpoint: `https://srv1848295.hstgr.cloud/apps/leanerp-sd-quiz/api/leaderboard`

## První nasazení na VPS

```bash
mkdir -p /srv/www/leanerp-sd-quiz/data
git clone https://github.com/Rada87/leanerp-sd-quiz.git /srv/www/leanerp-sd-quiz/app
cp /srv/www/leanerp-sd-quiz/app/.env.example /srv/www/leanerp-sd-quiz/.env
cd /srv/www/leanerp-sd-quiz/app
docker compose up -d --build
```

Nginx musí proxyovat `/apps/leanerp-sd-quiz/` na `127.0.0.1:8213` s trailing lomítkem v `proxy_pass`, aby se prefix odřízl před Express aplikací.

## Aktualizace

```bash
cd /srv/www/leanerp-sd-quiz/app
git pull --ff-only
docker compose up -d --build
curl -fsS -o /dev/null -w '%{http_code}\n' https://srv1848295.hstgr.cloud/apps/leanerp-sd-quiz/
curl -fsS https://srv1848295.hstgr.cloud/apps/leanerp-sd-quiz/api/leaderboard
```

Očekávaný stav je HTTP `200`. SQLite databáze je trvale uložena v `/srv/www/leanerp-sd-quiz/data/quiz.sqlite`; aktualizace kódu ji nikdy nepřepisuje.

## Activity Report pro event

Do `/srv/www/leanerp-sd-quiz/.env` lze před eventem přidat:

```dotenv
EVENT_START_AT=2026-09-15T08:00:00+02:00
EVENT_END_AT=2026-09-15T18:00:00+02:00
ACTIVITY_RETENTION_DAYS=180
```

Po změně `.env` je nutné znovu vytvořit kontejner přes `docker compose up -d`. Activity Report v Settings pak automaticky rozdělí data na before/during/after. Detailní anonymní export je na `/api/activity/export`; souhrn na `/api/activity/summary`.

Telemetrie neobsahuje IP adresy, zadaná jména hráčů, texty otázek ani texty odpovědí. Každá hra má náhodný alias `Player_XXXXXX`; zvolená možnost se ukládá jako option ID a písmeno A/B/C/D. Queue `clientId` se nikdy nezapisuje do SQLite.

## API kontrakt pro prezentaci

`GET /apps/leanerp-sd-quiz/api/leaderboard` vrací nejvýše deset záznamů v tomto tvaru:

```json
{
  "updatedAt": "2026-07-23T08:00:00.000Z",
  "entries": [
    {
      "playerName": "Anna",
      "score": 913,
      "percentage": 76,
      "correctAnswers": 10,
      "totalQuestions": 12,
      "createdAt": "2026-07-23T07:55:00.000Z"
    }
  ]
}
```

Endpoint nevrací interní ID záznamů ani administrativní data.
