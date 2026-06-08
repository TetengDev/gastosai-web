# GastosAI — Frontend

React 19 + TypeScript SPA for the GastosAI expense tracker.

Built with Vite, Tailwind CSS v4, Recharts, and React Router v7.

---

## Prerequisites

- Node.js LTS ([nodejs.org](https://nodejs.org))
- Backend API running on http://localhost:8080 (see [backend/README.md](../backend/README.md))

---

## Environment setup

Create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8080
```

For production, set this to your deployed backend URL (e.g. your Koyeb HTTPS URL).

---

## Running

```powershell
# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

App available at **http://localhost:5173**

To capture logs:

```powershell
npm run dev > logs\frontend.log 2>&1
```

---

## Build

```powershell
npm run build    # outputs to dist/
npm run preview  # preview the production build locally
npm run lint     # ESLint check
```

---

## Pages

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Spending donut chart by category + 10 most recent expenses |
| `/expenses` | Expenses | Full expense table — add, edit, delete |
| `/ask` | Ask AI | Natural-language query interface |

---

## Project structure

```
src/
├── api/
│   ├── client.ts       Axios instance (reads VITE_API_URL, attaches JWT if present)
│   ├── types.ts        Shared TypeScript interfaces (Expense, Category, reports)
│   ├── expenses.ts     Expense + report endpoint functions
│   ├── categories.ts   Category endpoint functions
│   └── ai.ts           AI query endpoint function
├── components/
│   ├── Navbar.tsx      Top navigation with active-link highlighting
│   └── ExpenseModal.tsx Add/edit expense form (modal)
├── hooks/
│   └── useExpenses.ts  Load, add, update, remove with local state
├── lib/
│   └── formatters.ts   formatCurrency (₱) and formatDate helpers
└── pages/
    ├── Dashboard.tsx
    ├── Expenses.tsx
    └── Ask.tsx
```

---

## Key dependencies

| Package | Purpose |
|---|---|
| `react-router-dom` v7 | Client-side routing |
| `axios` | HTTP client |
| `recharts` v3 | Charts (donut chart on Dashboard) |
| `tailwindcss` v4 | Utility-first styling |

---

## Logs

Dev server output can be redirected to `logs/` (git-ignored). The `logs/` directory is created automatically on first redirect.