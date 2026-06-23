Chci vytvořit webovou aplikaci – zábavný interaktivní kvíz pro stánek na IT setkání / Škoda IT Day 2026.

Kontext:
Budu mít stánek na IT setkání, kde budeme prezentovat náš produkt LEAN ERP. LEAN ERP je SAP platforma zaměřená hlavně na logistiku, výrobu, skladové procesy, materiálové toky, balení, expedici, plánování a podporu procesů v automotive prostředí. Kvíz má návštěvníky zaujmout, pobavit a zároveň jim nenásilně představit témata kolem LEAN ERP, SAP, logistiky, výroby a digitalizace.

Cíl aplikace:
Vytvoř moderní, rychlou, responzivní a vizuálně atraktivní kvízovou webovou aplikaci ve stylu Duolingo gamifikace, ale s vizuální identitou inspirovanou přiloženými screenshoty Škoda IT:
- černé pozadí,
- výrazná zelená barva,
- bílý text,
- futuristický IT vzhled,
- zaoblené karty,
- hravé animace,
- jednoduchá a přehledná UI logika.

Aplikace má běžet jako čistý frontend:
- HTML
- CSS
- JavaScript / TypeScript
- ideálně bez backendu
- hodnocení ukládat do localStorage
- architekturu připravit tak, aby šlo později localStorage snadno nahradit Supabase databází

Preferovaná technická varianta:
Použij buď:
1. čistý Vite + TypeScript,
nebo
2. React + Vite + TypeScript.

Pokud si musíš vybrat, použij React + Vite + TypeScript, protože aplikace bude později rozšiřována.

Design:
Aplikace má vycházet z přiložených screenshotů:
- primární pozadí: téměř černá / #000000 / #050505
- primární zelená: svěží neonová Škoda zelená podobná #6DFFA3 nebo #70FF9E
- sekundární zelená: tmavší zelená pro patterny a stíny
- text: bílý
- zvýraznění: zelené
- chybné odpovědi: červená, ale decentně a moderně
- správné odpovědi: zelená
- karty: tmavé, lehce oddělené od pozadí
- tlačítka: výrazná, zaoblená, hravá, s hover efekty
- styl má působit jako kombinace Škoda IT event vizuálu a Duolingo-style kvízu

Pozadí:
Vytvoř tmavé pozadí s jemným futuristickým patternem inspirovaným screenshoty:
- drobné zelené čárky / segmenty / šipky / digitální řádky
- pattern nesmí rušit čitelnost
- může být řešený CSS pseudo-elementem, SVG patternem nebo jednoduchým CSS backgroundem
- pattern má působit jako IT/data/logistika vizuál

Branding:
V aplikaci zobraz:
- název: LEAN ERP Quiz
- event text: Škoda IT Day 2026
- subtitle: Explore IT
- volitelně malý text: Powered by LEAN ERP Team
- nepoužívej skutečné logo jako obrázek, pokud není k dispozici, ale můžeš použít textovou variantu „ŠKODA IT“ v podobném duchu

Struktura aplikace:
Aplikace bude mít tyto obrazovky:

1. Start screen
- Velký nadpis: LEAN ERP Quiz
- Podnadpis: Test your SAP & logistics instincts
- Krátký text: Answer fast, score high, and see how close you are to becoming a LEAN ERP expert.
- Tlačítko: Start quiz
- Volitelně vstup pro jméno / přezdívku hráče
- Pokud uživatel nezadá jméno, použij automaticky „Guest“
- Animovaný vstup obrazovky
- Hravý vizuální prvek, například jednoduchý maskot/robot vytvořený čistě pomocí CSS nebo emoji-like illustration, nikoli externí asset

2. Quiz screen
Každá otázka obsahuje:
- číslo otázky
- text otázky
- 3 možnosti odpovědi
- časový limit 30 sekund
- progress bar času
- ukazatel aktuálního možného bodového zisku
- celkové skóre
- animaci při výběru odpovědi

Bodování:
- Za každou otázku je maximálně 100 bodů.
- Čas na otázku je 30 sekund.
- Body se s ubývajícím časem snižují nelineárně.
- Na začátku má skóre klesat rychleji, později pomaleji.
- Použij například vzorec:

remainingRatio = remainingTime / totalTime
points = Math.round(100 * Math.pow(remainingRatio, 0.55))

Vysvětlení:
- při 30 sekundách zbývá 100 bodů
- na začátku body klesají rychleji
- později klesají pomaleji
- minimální skóre za správnou odpověď může být například 10 bodů, pokud uživatel odpoví těsně před koncem
- za špatnou odpověď je 0 bodů
- pokud čas vyprší, otázka se vyhodnotí jako nezodpovězená a hráč získá 0 bodů

Důležité:
Bodovací vzorec vlož do samostatné funkce, například calculatePoints(remainingTime, totalTime), aby šel později snadno změnit.

3. Feedback po odpovědi
Po kliknutí na odpověď:
- okamžitě zastav timer
- zvýrazni správnou odpověď zeleně
- pokud hráč vybral špatně, zvýrazni jeho odpověď červeně
- zobraz krátký feedback:
  - Correct! + získané body
  - nebo Not quite! + krátké vysvětlení
- krátká animace:
  - správně: zelený pulse, confetti-like efekt, bounce
  - špatně: jemné zatřesení karty, červený flash
- po cca 1,5 až 2 sekundách automaticky přejdi na další otázku
- přidej také tlačítko Continue, pokud bude uživatel chtít pokračovat ručně

4. Completion screen
Po dokončení kvízu zobraz:
- celkové skóre
- maximální možné skóre
- procentuální úspěšnost
- slovní vyhodnocení podle výsledku
- animaci dokončení kvízu
- tlačítko Play again
- tlačítko View leaderboard

Vyhodnocení:
0–30 %:
„SAP Rookie“
Text: You are just entering the world of logistics and enterprise processes.

31–60 %:
„Process Explorer“
Text: You understand the basics and you are ready to explore more.

61–85 %:
„LEAN ERP Specialist“
Text: Strong result. You clearly understand how logistics and production processes fit together.

86–100 %:
„Enterprise Process Master“
Text: Excellent. You think like a real SAP logistics expert.

5. Leaderboard screen
- Zobraz lokální žebříček uložený v localStorage
- Ukládej:
  - jméno hráče
  - skóre
  - procento
  - datum a čas
  - počet správných odpovědí
- Seřaď výsledky od nejlepšího skóre
- Zobraz top 10 výsledků
- Přidej tlačítko Clear local leaderboard, ale s potvrzením
- Přidej tlačítko Back to start

Datové úložiště:
Vytvoř storage interface, aby bylo možné později nahradit localStorage za Supabase.

Například:

interface ScoreRecord {
  id: string;
  playerName: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  createdAt: string;
}

interface ScoreStorage {
  saveScore(record: ScoreRecord): Promise<void>;
  getScores(): Promise<ScoreRecord[]>;
  clearScores(): Promise<void>;
}

Implementuj LocalStorageScoreStorage, ale připrav strukturu tak, aby šlo později vytvořit SupabaseScoreStorage bez přepisování UI.

Otázky:
Připrav ukázkovou sadu alespoň 10 otázek v samostatném souboru questions.ts nebo questions.js.

Každá otázka má mít:
- id
- question
- options: pole 3 odpovědí
- correctOptionId
- explanation
- category

Příklad struktury:

{
  id: "q1",
  category: "Logistics",
  question: "What is the main purpose of a Warehouse Management system in SAP?",
  options: [
    { id: "a", text: "To manage physical stock movements and storage locations" },
    { id: "b", text: "To design marketing campaigns" },
    { id: "c", text: "To calculate employee salaries" }
  ],
  correctOptionId: "a",
  explanation: "Warehouse Management supports stock placement, picking, movements and warehouse execution."
}

Témata otázek:
- SAP logistics
- Warehouse Management
- material flow
- production supply
- inbound delivery
- outbound delivery
- handling units
- packaging
- inventory accuracy
- process automation
- LEAN ERP
- automotive production

Jazyk otázek:
Primárně angličtina, protože event může být mezinárodní.
Aplikaci ale připrav tak, aby šla později jednoduše přeložit do češtiny nebo němčiny.

Animace:
Použij CSS animace a/nebo Framer Motion, pokud zvolíš React.
Animace mají být poutavé, ale ne přeplácané.

Požadované animace:
- start kvízu: zoom/fade-in hlavní karty
- přechod mezi otázkami: slide/fade
- správná odpověď: zelený pulse + jemný bounce
- špatná odpověď: shake + červené zvýraznění
- dokončení kvízu: confetti-like efekt nebo celebration animation
- progress bar: plynulé ubývání
- tlačítka: hover scale / active press efekt

UX požadavky:
- aplikace musí být použitelná na dotykové obrazovce u stánku
- velká tlačítka
- dobře čitelný text i z větší vzdálenosti
- žádné malé klikací prvky během samotného kvízu
- jasný feedback
- rychlé tempo
- žádné složité formuláře
- aplikace musí fungovat offline po načtení
- žádné externí API
- žádné povinné přihlášení

Responzivita:
Aplikace musí dobře fungovat:
- na notebooku
- na velké obrazovce / monitoru
- na tabletu
- na dotykovém kiosku

Doporučený layout:
- max šířka hlavního obsahu cca 900–1100 px
- obsah centrovaný
- na velké obrazovce může být vlevo hlavní quiz karta a vpravo skóre / progress panel
- na mobilu vše pod sebou

Kódová kvalita:
- rozděl kód do komponent
- nepoužívej jeden obrovský soubor
- jasné názvy komponent
- jasné názvy funkcí
- žádné zbytečné knihovny
- přidej komentáře tam, kde je složitější logika, hlavně u výpočtu bodů a storage interface
- připrav projekt tak, aby šel spustit pomocí npm install a npm run dev

Navržená struktura projektu:

src/
  components/
    StartScreen.tsx
    QuizScreen.tsx
    QuestionCard.tsx
    AnswerButton.tsx
    TimerBar.tsx
    ResultScreen.tsx
    Leaderboard.tsx
    BackgroundPattern.tsx
  data/
    questions.ts
  storage/
    ScoreStorage.ts
    LocalStorageScoreStorage.ts
  utils/
    scoring.ts
    format.ts
  styles/
    globals.css
  App.tsx
  main.tsx

Stavy aplikace:
Použij jednoduchý stavový model:
- "start"
- "quiz"
- "result"
- "leaderboard"

Během kvízu sleduj:
- currentQuestionIndex
- selectedAnswer
- score
- correctAnswers
- remainingTime
- isAnswered
- playerName
- answerHistory

Testovací scénáře:
Po implementaci ověř:
1. Start kvízu bez jména → použije se Guest.
2. Start kvízu se jménem → jméno se uloží k výsledku.
3. Správná odpověď v prvních sekundách → vysoké skóre.
4. Správná odpověď na konci limitu → nízké skóre.
5. Špatná odpověď → 0 bodů.
6. Vypršení času → 0 bodů a přechod dál.
7. Po dokončení se výsledek uloží do localStorage.
8. Leaderboard zobrazí top 10 výsledků.
9. Play again resetuje stav kvízu, ale nesmaže leaderboard.
10. Clear leaderboard smaže pouze uložené výsledky.

Důležité vizuální požadavky:
- Nepoužívej defaultní nudný vzhled.
- Vytvoř prémiový eventový vzhled.
- UI má působit jako hotová aplikace pro firemní stánek, ne jako školní demo.
- Inspiruj se Duolingo principem: jednoduchost, hravost, okamžitý feedback, motivace pokračovat.
- Inspiruj se Škoda IT screenshoty: černá, zelená, bílá, futuristický pattern, výrazná typografie.

Výstup:
Vytvoř kompletní funkční aplikaci.
Na konci napiš:
- jak ji spustit
- jak upravit otázky
- kde změnit bodovací logiku
- kde v budoucnu napojit Supabase místo localStorage

Kiosk mode:
Protože aplikace poběží na stánku, přidej volitelný kiosk režim:
- pokud je uživatel na výsledkové obrazovce déle než 45 sekund bez interakce, aplikace se automaticky vrátí na start screen
- pokud je uživatel na leaderboardu déle než 45 sekund bez interakce, aplikace se automaticky vrátí na start screen
- leaderboard se tím nesmaže
- kiosk timeout nastav jako konstantu, například KIOSK_IDLE_TIMEOUT_MS