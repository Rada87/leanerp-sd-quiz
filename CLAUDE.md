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

**Admin zámek.** Všechno, co maže, přepisuje nebo odhaluje data, je za heslem:
`Clear Leaderboard`, `Export/Import JSON`, `Edit Questions`, `Activity Report`
a swipe-to-delete na leaderboardu. Heslo je `ADMIN_PASSWORD` v `.env` a **žádný výchozí fallback neexistuje** —
zabudované heslo v repozitáři je veřejné heslo. Když proměnná chybí, admin
routy vrací 503 a panel to hlásí; hra běží dál. `POST /api/admin/session`
vrátí token, který klient posílá v hlavičce `x-admin-token`; `requireAdmin`
v `server/routes.js` jím chrání příslušné routy — **schování tlačítek v UI je
jen kosmetika, autoritativní je server**.

Token žije **jen v paměti** (`src/utils/adminAuth.ts`), stejně jako queue
identita: tablet ponechaný na stojanu se po reloadu sám zamkne. Herní cesta
heslo nikdy nepotřebuje — `POST /scores`, fronta, `GET /leaderboard`
i zrcadlení zůstávají veřejné, aby zámek nemohl zablokovat hru.

Throttle počítá **poslední** hop `X-Forwarded-For` (`trust proxy` = 1
v `server/index.js`), protože Nginx přidává skutečnou IP na konec a cokoli před
ní poslal klient sám. Důvěřovat celému řetězci by znamenalo, že si útočník
podvrhne novou IP na každý pokus, nebo vyčerpá limit obsluze. Testy v
`server/admin.test.js` (`npm test`) obojí hlídají.

`FallbackScoreStorage` na 401 **nesmí** spadnout do localStorage zálohy —
jinak by neautorizované „clear" tiše smazalo lokální kopii místo odmítnutí.

**Konzole obsluhy `/admin.html`.** Statická stránka v `public/` (žádný React,
žádný build) — schválně, aby při potížích s aplikací šla pořád otevřít a uvolnit
frontu. Po zadání admin hesla ukazuje živou frontu a umí vykopnout jednotlivce
(`POST /api/admin/queue/kick`) nebo ji celou vyprázdnit
(`POST /api/admin/queue/clear`) nebo zastavit rozehranou hru
(`POST /api/admin/queue/stop`); vše je za `requireAdmin`.

Kick jen uvolní slot — rozehraná hra na tabletu běží dál, protože kvíz o frontě
nic neví a nikdy na ni nečeká. Stop je ostřejší: server pošle SSE událost
`player_stopped` s `clientId` a tablet se do sekundy vrátí na úvodní obrazovku
s vysvětlující hláškou, skóre se neuloží. Kvíz tu událost slyší, protože už
`EventSource` drží kvůli pozicím ve frontě (`src/hooks/useQueue.ts`) — proto
neplatí doslova, že „kvíz jen odesílá".

**Časový limit návštěvnického zařízení.** `src/utils/visitSession.ts`: od prvního
spuštění hry běží `VISIT_TIME_LIMIT_MS` (15 min), po vypršení se **okamžitě**
(i uprostřed otázky, rozehraná hra se neuloží) zobrazí `FarewellScreen` a uvolní
se slot fronty. Důvod není šetření zdrojů, ale fronta: je globální, takže kdo
hraje z kanceláře, bere slot lidem u stánku.

Na rozdíl od queue identity se tenhle stav **musí** ukládat do `localStorage`
(`leanerp-quiz-visit-started-at`) — limit, který smaže reload, nikoho nezastaví.
Jde o zpomalení, ne zámek: anonymní okno nebo smazání dat ho resetuje, a to je
v pořádku.

**Tablety na stánku musí být v kiosk režimu**, jinak se po 15 minutách zablokují
taky. Otevřít jednou `?kiosk=1` (uloží `leanerp-quiz-kiosk`, přežije restart)
nebo přepnout v admin panelu. `?kiosk=1` zároveň vyléčí už zablokované zařízení —
na děkovné obrazovce žádné ovládání není. `?kiosk=0` režim zruší.

Limit **selhává otevřeně**: když `localStorage` není dostupný, hraje se bez omezení.

**Activity logging:** `POST /api/activity` ukládá do SQLite pouze whitelistované anonymní události. Nikdy do něj neposílat zadané jméno hráče, text otázky/odpovědi ani queue `clientId`. Korelace používá paměťové `sessionId`, `quizRunId` a náhodný alias `Player_XXXXXX`; odpověď ukládá pouze option ID a písmeno A/B/C/D. `EVENT_START_AT`/`EVENT_END_AT` určují before/during/after fáze reportu a `ACTIVITY_RETENTION_DAYS` výchozí 180denní retenci. Souhrn je `/api/activity/summary`, anonymní timeline `/api/activity/export`.

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
