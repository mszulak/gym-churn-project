# Gym Churn Analysis — frontend

Frontend aplikacji do wykrywania klientów siłowni z wysokim ryzykiem rezygnacji z karnetu.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Base UI) · PapaParse

## Uruchomienie (lokalnie, npm)

```bash
npm install
npm run dev      # http://localhost:3000
```

Inne skrypty:

```bash
npm run lint     # ESLint
npm run build    # build produkcyjny (output: standalone)
npm run start    # serwer produkcyjny po buildzie
```

## Struktura

```
src/
├── app/                     # routing (App Router), layout, globalne style i motyw
├── components/
│   ├── layout/              # nagłówek, stopka
│   ├── sections/            # sekcje strony głównej
│   ├── upload/              # wgrywanie i podgląd CSV (komponenty klienckie)
│   └── ui/                  # komponenty shadcn/ui (generowane: npx shadcn add ...)
├── config/site.ts           # nazwa aplikacji, wersja, limity uploadu
└── lib/                     # parsowanie CSV, formatowanie, utils
```

## Stan v0.1

- Plik CSV jest walidowany (rozszerzenie, rozmiar ≤ 50 MB) i parsowany **wyłącznie w przeglądarce** —
  nic nie jest wysyłane na serwer.
- Separator (`,` / `;` / tab) wykrywany automatycznie; podgląd pierwszych 10 wierszy + liczba wierszy/kolumn.
- Przycisk „Analizuj” jest nieaktywny do czasu podłączenia backendu.

## Docker (na później)

`next.config.ts` ma ustawione `output: "standalone"` — build generuje `.next/standalone/server.js`,
który można uruchomić bez pełnego `node_modules` (trzeba dokopiować `public/` i `.next/static/`).
