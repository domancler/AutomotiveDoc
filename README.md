# AutomotiveDoc (starter tesi)

Webapp demo per **gestione documentale/contrattuale** della vendita auto.

## Stack
- React + Vite + TypeScript
- TailwindCSS
- UI components stile *shadcn/ui* (Button, Card, Badge, Table, Tabs, etc.)
- Dark/Light/System theme (next-themes)
- React Router
- Recharts (grafici)
- React Query + Axios (pronti; qui uso mock data)

## Avvio
```bash
npm install
npm run dev
```

## Pagine
- **Dashboard**: KPI + grafici riassuntivi
- **Fascicoli**
  - In corso
  - Tutti
- **Dettaglio fascicolo**: overview + documenti + timeline + note

## Note
I dati sono mock in `src/mock/`. Puoi sostituirli collegando le chiamate Axios in `src/lib/api.ts`.
