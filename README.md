# LeanERP SD Quiz

Kvízová aplikace pro Škoda / LeanERP Service Desk. Postavená na React 19 + TypeScript + Vite, nasazená na GitHub Pages.

## Příkazy

| Příkaz | Popis |
|---|---|
| `npm install` | Nainstaluje závislosti (spustit po klonování) |
| `npm run dev` | Spustí vývojový server na http://localhost:5173/leanerp-sd-quiz/ |
| `npm run build` | Zkompiluje TypeScript a sestaví produkční bundle do složky `dist/` |
| `npm run preview` | Lokálně zobrazí produkční build (po `npm run build`) |
| `npm run lint` | Spustí ESLint kontrolu kódu |

## Nasazení

Push do větve `main` automaticky spustí GitHub Actions, které sestaví aplikaci a nasadí ji na GitHub Pages.
