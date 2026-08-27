# CLAUDE.md

## Propojení kvízu s prezentací

Jde o **dva samostatné repozitáře**, které spolu mluví přes HTTP na jedné doméně:

| | repozitář | běh | URL |
|---|---|---|---|
| kvíz (tablety) | `leanerp-sd-quiz` | Docker, Express + SQLite na `127.0.0.1:8213` | `/apps/leanerp-sd-quiz/` |
| prezentace (velká obrazovka) | `leanerp-skodadays-2026` | statické soubory, rsync, **žádný build krok** | `/www/leanerp-skodadays-2026/` |

Obojí obsluhuje jeden Nginx na `srv1848295.hstgr.cloud`, takže jsou na **stejném originu** — proto fungují relativní cesty a není potřeba CORS.

### Tok dat

```
tablet (kvíz)                  server                    prezentace
  POST /api/session      →   broadcast() ──── SSE ────→  /api/events
  POST /api/scores       →   + zapíše do latest ────────→ /api/state  (polling záloha)
  POST /api/queue/*      →   queue.js
```

Kvíz **jen odesílá**, prezentace **jen přijímá**. Kvíz o prezentaci nic neví a nikdy na ni nečeká — mirroring nesmí zdržet ani zablokovat hru.

### Události (`server/events.js`)

| událost | odesílá | obsah |
|---|---|---|
| `quiz_progress` | `POST /api/session` při každé otázce | otázka, možnosti, odpověď, skóre |
| `quiz_completed` | `POST /api/scores` po dohrání | jméno, skóre, pořadí |
| `queue_state` | každá změna fronty | kdo hraje, kdo čeká |

`broadcast()` zároveň ukládá poslední stav do `latest` se sekvenčním číslem, které čte `GET /api/state`.

### Dvě cesty k prezentaci, ne jedna

Primárně SSE (`/api/events`), záložně polling (`GET /api/state` po 2 s). Prezentace přepne na polling, když se stream do 6 s neotevře nebo spadne, a vrátí se k SSE, jakmile se uzdraví.

**Proč:** firemní proxy bufferuje dlouhoběžící odpovědi — drží stream, dokud se nenaplní její buffer. Projevuje se to jako `EventSource` trvale ve stavu `CONNECTING`, pak „OPEN až s odstupem" a dávkově opožděné události. Běžné požadavky tou proxy procházejí bez potíží, proto polling funguje i tam, kde SSE ne.

Obrana proti bufferování (nesahat bez důvodu):
- každá zpráva je odsazená na 2 KB (`PAD` v `server/events.js`), aby ji proxy protlačila hned
- `X-Accel-Buffering: no` na `/api/events` (Nginx si hlavičku vezme pro sebe, ke klientovi nedojde — to je v pořádku)
- Nginx má pro `/api/events` `proxy_buffering off` a `proxy_read_timeout 1h`

### Fronta — jeden hráč v jeden okamžik

`server/queue.js`, stav **jen v paměti** (jeden Express proces je autoritativní; restart ji vynuluje, což je záměr).

Sloty se uvolňují samy: aktivní hráč po 60 s ticha, „na řadě" bez tapnutí po 45 s, čekající po 60 s. Tablet posílá heartbeat po 15 s a při zavření stránky pošle `sendBeacon` na `/queue/leave`.

**Identita hráče (`src/utils/clientId.ts`) se nikdy nesmí ukládat.** `localStorage` sdílejí všechny taby a `sessionStorage` se kopíruje do duplikovaného tabu — v obou případech dva taby vystupují jako jeden tablet, druhý si při vstupu do fronty uvolní slot sám sobě a **hrají dva lidé naráz**. Identita proto žije jen v paměti jednoho načtení stránky. Nic se tím neztrácí: kvíz stav stejně nepřežije reload.

Když je server nedostupný, kvíz hráče **pustí hrát i bez fronty** (`App.tsx`) — výpadek nesmí zablokovat hru. Konzole to hlásí jako `queue gate inactive`; v tu chvíli může hrát víc lidí zároveň.

## Na co si dát pozor

**Prezentace nemá build krok.** `script.js` a `styles.css` mají napevno stejná jména bez content hashe, takže si je prohlížeč může nacachovat nezávisle na `index.html` a **verze se rozejdou**. Nginx proto posílá `no-cache` na HTML/CSS/JS a `max-age=86400` na média (`/etc/nginx/conf.d/skodadays-cache-map.conf`). Z toho plyne pravidlo pro kód: **každé hledání prvku v DOM ošetřit `?.`**. Nechráněné `element.addEventListener` na neexistujícím prvku shodí zbytek skriptu včetně `connectQuizEvents()` na jeho konci — zrcadlení pak tiše umře.

**Nastavení „Show on this screen"** (⚙ na prezentaci) je lokální pro danou obrazovku (localStorage) a má tři hodnoty: `full` / `results` / `off`. Když není `full`, prezentace živé otázky **záměrně** nezobrazuje — proto je vedle ozubeného kolečka štítek `Mirror: …`, aby to nevypadalo jako porucha. Hráči na tabletech tuhle volbu nemají, kvíz vysílá vždy.

**Ladění:** konzole obou stran loguje pod prefixy `[quiz-mirror]`, `[quiz-sync]` a `[quiz-queue]`, včetně stavového řádku po 30 s (odhalí stream, který je `OPEN`, ale mlčí).

**Verze je na třech místech** a synchronizuje se ručně: `src/constants.ts` (`APP_VERSION`), `package.json` a `index.html` prezentace (`.settings-version`). Prezentace nemá build, takže ji z `package.json` vytáhnout nelze.

**Konstanty skórování jsou zduplikované** v `src/constants.ts` a v `script.js` prezentace (`MAX_POINTS_PER_QUESTION`, `SCORING_EXPONENT`, …), aby zrcadlený výpočet bodů seděl. Při změně upravit obojí.

## Nasazení

Nasazuje se **odděleně**, ale změny kontraktu se musí nasadit spolu.

```bash
# kvíz
ssh rada@srv1848295.hstgr.cloud "cd /srv/www/leanerp-sd-quiz/app && git pull --ff-only && docker compose up -d --build"

# prezentace (z kořene jejího repozitáře)
rsync -av --delete --exclude='.gitignore' src/public/ rada@srv1848295.hstgr.cloud:/srv/www/leanerp-skodadays-2026/public/
```

Rebuild kvízu vynuluje frontu — aktivní hráč přijde o slot (rozehraná hra na tabletu doběhne). Nasazovat mimo špičku.

Podrobnosti v [deploy.md](deploy.md). Konfigurace Nginxu žije **jen na serveru**, není ve verzování.
