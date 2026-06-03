# Frontend Refactor Guide

A plan for restructuring this React frontend so it scales. The headline problem: **large files that hold an entire screen's worth of markup, logic, and data-fetching instead of being composed from small, reusable components.** Everything below is built around fixing that.

Stack: **Vite 8, React 19, react-router-dom 7, Tailwind 4, nivo + recharts (data viz), three.js, ESLint (flat config).**

---

## The core principle: a page should orchestrate, not implement

Right now many files look like this — one default-exported component doing everything:

```jsx
// pages/Dashboard.jsx  ❌  (everything in one file)
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <header className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button className="px-4 py-2 bg-blue-600 ...">Export</button>
      </header>

      {/* 40 lines of stat-card markup, repeated 4x */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">...</div>
        <div className="rounded-lg border p-4">...</div>
        ...
      </div>

      {/* 60 lines of inline ResponsiveBar config */}
      <ResponsiveBar data={data.revenue} keys={[...]} ... />

      {/* another 60 lines of recharts setup */}
      <LineChart>...</LineChart>
    </div>
  );
}
```

A single file like this is hard to read, impossible to reuse, painful to test, and causes merge conflicts the moment two people touch it. The target is a page that reads like a table of contents:

```jsx
// pages/Dashboard.jsx  ✅  (orchestration only)
export default function Dashboard() {
  const { data, isLoading } = useDashboardStats(); // data lives in a hook

  if (isLoading) return <PageSpinner />;

  return (
    <PageLayout title="Dashboard" actions={<ExportButton />}>
      <StatCardGrid stats={data.summary} />
      <RevenueBarChart data={data.revenue} />
      <TrendLineChart data={data.trend} />
    </PageLayout>
  );
}
```

Each line is now a named, reusable, testable unit. **If a JSX block is repeated, is conceptually one "thing", or is longer than ~30 lines, it should be its own component.**

---

## How to break a file apart (the extraction recipe)

When you open a bloated file, pull pieces out in this order:

1. **Repeated markup → a component with props.** Four near-identical stat cards become one `<StatCard label value delta />` rendered in a list.
2. **Data fetching + the state around it → a custom hook.** `useState`/`useEffect`/`fetch` clusters move into `useDashboardStats()`. The component no longer knows _how_ data arrives.
3. **Chart configuration → a dedicated chart component.** A 60-line nivo/recharts config is not page logic — wrap it (see the charts section below).
4. **Self-contained UI sections → section components.** Headers, toolbars, filter bars, modals.
5. **Pure helpers → `lib/`.** Formatting, calculations, transforms — anything with no JSX and no React.

A good rule of thumb: **a component file should fit on one or two screens without scrolling.** If it doesn't, there's another component hiding inside it.

### Container vs. presentational split

Keep components that _fetch/own state_ separate from components that _just render props_:

- **Presentational** (`StatCard`, `RevenueBarChart`): receive everything via props, no fetching, no global state. Trivially reusable and testable.
- **Container** (a page, or a feature's top component): wires hooks to presentational components.

This is what makes a presentational component reusable across multiple pages — it has no idea where its data came from.

---

## Folder structure

Everything under `src/`. Feature-based, because it scales far better than grouping by file type once you have more than a few screens.

```
src/
├── app/
│   ├── App.jsx              # root: providers + router
│   ├── router.jsx           # route definitions (react-router 7)
│   └── providers.jsx        # context providers composed together
│
├── pages/                   # one file per route — ORCHESTRATION ONLY
│   ├── Dashboard.jsx
│   └── Settings.jsx
│
├── features/                # domain modules — the bulk of your code
│   └── dashboard/
│       ├── components/       # StatCard, StatCardGrid, ExportButton...
│       ├── charts/           # RevenueBarChart, TrendLineChart...
│       ├── hooks/            # useDashboardStats...
│       ├── api/              # dashboardApi.js
│       └── types.js          # (or .ts)
│
├── components/              # SHARED, app-wide UI primitives
│   ├── ui/                  # Button, Card, Input, Spinner, Modal...
│   └── layout/              # PageLayout, Navbar, Sidebar
│
├── charts/                  # shared/generic chart wrappers (if reused across features)
│
├── hooks/                   # shared hooks (useMediaQuery, useDebounce...)
├── lib/                     # pure helpers: formatters, math, date utils
├── services/  (or api/)     # base fetch client, interceptors, config
├── config/                  # env access, constants
├── styles/                  # global.css with Tailwind import + @theme
└── assets/                  # images, fonts, models (.glb for three.js)
```

The split that matters most:

- **`components/ui/`** = generic, reusable anywhere (a `Button` knows nothing about dashboards).
- **`features/<x>/components/`** = specific to one domain (a `StatCardGrid` only makes sense on the dashboard).

When something in a feature gets reused by a second feature, _promote_ it up to the shared `components/` folder. Don't pre-promote — let reuse pull things upward.

---

## Charts (nivo + recharts) — your biggest source of bloat

Chart configs are verbose and almost always sit inline. Each chart should be its own component that takes data as a prop and owns its config:

```jsx
// features/dashboard/charts/RevenueBarChart.jsx
import { ResponsiveBar } from "@nivo/bar";

export function RevenueBarChart({ data }) {
  return (
    <div className="h-80">
      <ResponsiveBar
        data={data}
        keys={["revenue"]}
        indexBy="month"
        margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
        /* ...all the config that used to live in the page... */
      />
    </div>
  );
}
```

Benefits: the page stays readable, the chart is reusable, and you can standardise theming. Because you're mixing **nivo** and **recharts**, define shared colour palettes, margins, and tooltip styles once in `lib/chartTheme.js` and import them into every chart wrapper — otherwise the two libraries drift apart visually. Longer term, consider standardising on one of the two to cut bundle size; running both ships two charting engines.

---

## three.js — isolate the scene completely

3D code is the worst offender for bloating a React file. Keep the entire scene (renderer, camera, animation loop, cleanup) inside one component with a `useEffect` that tears everything down on unmount:

```jsx
// features/<x>/three/SceneViewer.jsx
export function SceneViewer() {
  const mountRef = useRef(null);
  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    mountRef.current.appendChild(renderer.domElement);
    // ...scene, camera, animation loop...
    return () => {
      renderer.dispose(); /* remove canvas, cancel RAF */
    };
  }, []);
  return <div ref={mountRef} className="h-full w-full" />;
}
```

The rest of the app treats it as a black box: `<SceneViewer />`. Always dispose geometries/materials/renderer in cleanup or you'll leak GPU memory across navigations.

---

## Data layer: stop fetching inside components

Inline `fetch` + `useState` + `useEffect` is the second-biggest scalability problem after the component issue. Centralise it:

```js
// services/apiClient.js  — one place for base URL, headers, error handling
const BASE = import.meta.env.VITE_API_URL;

export async function apiGet(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
```

```js
// features/dashboard/api/dashboardApi.js
import { apiGet } from "@/services/apiClient";
export const getDashboardStats = () => apiGet("/stats");
```

```js
// features/dashboard/hooks/useDashboardStats.js
export function useDashboardStats() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    getDashboardStats()
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);
  return { data, isLoading, error };
}
```

Now components consume `useDashboardStats()` and never see `fetch`. **Strongly consider TanStack Query (React Query)** — you already have the `@types/react` setup and the dashboard pattern is exactly what it's built for. It removes the loading/error/refetch boilerplate above and gives you caching for free. Worth adding as part of this refactor.

---

## Tailwind 4 specifics

You're on Tailwind 4 via `@tailwindcss/vite`, which is **CSS-first** — there's no `tailwind.config.js` by default. Configure tokens in your CSS:

```css
/* src/styles/global.css */
@import "tailwindcss";

@theme {
  --color-brand: #2563eb;
  --color-surface: #1e1e1e; /* you tend to build dark-themed UIs */
}
```

Refactor implication: when you extract a `<Button>` or `<Card>`, define variants with these theme tokens rather than repeating raw colour hex/utility soup in every page. That's how you stop copy-pasting `className="rounded-lg border p-4 bg-..."` into forty places.

---

## Imports: set up path aliases

Long `../../../` chains make moving files painful and discourage refactoring. Add an alias so imports are absolute:

```js
// vite.config.js
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
```

Then `import { Button } from '@/components/ui/Button'` everywhere. If you move to TypeScript, mirror this in `tsconfig.json` `paths`.

---

## Worked example: decomposing a ~600-line page

Take a real page like `BoostPickups.jsx`. It works, but everything lives in one file. Before extracting components, notice the most important thing: **a large share of the file isn't React at all** — it's pure math, constants, and data transforms that happen to sit in a `.jsx` file. That code can't be reused or tested where it is, and it buries the actual UI.

### Step 1 — inventory what's in the file

Sorting the file into buckets reveals six distinct concerns masquerading as one component:

| Bucket                      | What's in it (from this file)                                                                          | Where it belongs                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| **Pure constants/geometry** | `FL_X`, `FL_Y`, `SV_*`, the field polygons, `CENTER_CIRCLE_R`                                          | `lib/fieldGeometry.js`                            |
| **Pure coordinate helpers** | `toSvg`, `svgPts`, the pre-computed reference points                                                   | `lib/fieldGeometry.js`                            |
| **Pure scale/stat helpers** | `heatColor`, `median`, `usableLocation`, `medianLocation`, `fallbackPadType`, `teamLabel`, `teamColor` | `lib/heatScale.js`, `lib/stats.js`, `lib/team.js` |
| **Data transforms**         | the big `allPads` builder, the `players` sort+colour, the hero-metric reductions                       | `features/boost/transforms/`                      |
| **Sub-components**          | `FieldPickupMap`, `StatBadge`, `PlayerHeatmapCard`                                                     | charts / ui / feature components                  |
| **Page sections**           | header, hero metrics, filter pills, heat legend, two-column grid, footer legend                        | feature components                                |

The first four buckets — **roughly 40% of the file — contain no JSX and no React.** They are the single biggest reason the file feels overwhelming, and they're the easiest, safest things to pull out first.

### Step 2 — pure logic leaves the page entirely

```js
// lib/fieldGeometry.js  — no React, just math
export const FL_X = 4096;
export const FL_Y = 5120;
// ...SV_* dims, BLUE_HALF/ORANGE_HALF polygons...
export function toSvg(ux, uy) {
  /* ... */
}
export function svgPts(coords) {
  /* ... */
}
export const CENTER_CIRCLE_R = (520 / (FL_X * 2)) * SV_FW;
```

```js
// features/boost/transforms/buildPads.js  — the giant useMemo body, now a pure function
export function buildPads(data) {
  if (Array.isArray(data?.pads) && data.pads.length) {
    /* normalise */
  }
  // ...the events → pad-map reduction...
  return pads;
}
```

These are now **unit-testable in isolation** — you can assert `toSvg(0, 0)` returns the centre, or feed `buildPads` a fixture and check the output, with no rendering involved. That was impossible while they lived inside the component.

### Step 3 — one hook owns all the data work

The page currently runs `usePageData`, `useAnalysisJob`, and four `useMemo` blocks. Collapse all of it into a single feature hook so the page never sees the wiring:

```js
// features/boost/hooks/useBoostPickups.js
export function useBoostPickups() {
  const { data, loading, error, refetch } = usePageData("/api/boost-pickups");
  const analysis = useAnalysisJob(refetch);

  const players = useMemo(() => buildPlayers(data?.players), [data?.players]);
  const pads = useMemo(() => buildPads(data), [data]);
  const metrics = useMemo(() => buildMetrics(players, data), [players, data]);

  const status = loading ? "loading" : error || !data ? "empty" : "ready";
  return { status, meta: data, players, pads, metrics, analysis };
}
```

### Step 4 — the repeated loading/error/upload block becomes a wrapper

The `loading` / `error-or-empty` / `analysis-in-progress` + `UploadReplay` block almost certainly repeats on **every page** in this app. That's duplicated boilerplate begging to be one shared component:

```jsx
// components/layout/ReplayPage.jsx  — reused by every replay page
export default function ReplayPage({ status, analysis, children }) {
  return (
    <>
      {analysis.job && (
        <AnalysisProgress
          {...analysis.job}
          onComplete={analysis.handleComplete}
        />
      )}
      {status === "loading" && <CenteredMessage>Loading…</CenteredMessage>}
      {status === "empty" && (
        <UploadReplay onAnalysisStart={analysis.handleStart} />
      )}
      {status === "ready" && children}
    </>
  );
}
```

Every page that used to hand-roll those three states now just wraps its content in `<ReplayPage>`.

### Step 5 — the page becomes pure orchestration

After extracting the geometry to `lib/`, the transforms to `transforms/`, the data work to the hook, the three sub-components, and the page sections, the ~600-line file collapses to about 25 lines that read like a contents page:

```jsx
// pages/BoostPickups.jsx
import { useState } from "react";
import { useBoostPickups } from "@/features/boost/hooks/useBoostPickups";
import ReplayPage from "@/components/layout/ReplayPage";
import BoostPickupsHeader from "@/features/boost/components/BoostPickupsHeader";
import TeamHeatmapColumns from "@/features/boost/components/TeamHeatmapColumns";
import HeatmapLegendFooter from "@/features/boost/components/HeatmapLegendFooter";

export default function BoostPickups() {
  const [filter, setFilter] = useState("all");
  const { status, meta, players, pads, metrics, analysis } = useBoostPickups();

  return (
    <ReplayPage status={status} analysis={analysis}>
      <BoostPickupsHeader
        meta={meta}
        metrics={metrics}
        filter={filter}
        onFilterChange={setFilter}
        analysis={analysis}
      />
      <main className="mx-auto max-w-7xl px-8 py-8">
        <TeamHeatmapColumns players={players} pads={pads} filter={filter} />
        <HeatmapLegendFooter meta={meta} />
      </main>
    </ReplayPage>
  );
}
```

### Resulting file tree for this one page

```
src/
├── lib/
│   ├── fieldGeometry.js          # constants, toSvg, svgPts, reference points
│   ├── heatScale.js              # heatColor + legend colour stops
│   ├── stats.js                  # median, usableLocation, medianLocation
│   └── team.js                   # teamLabel, teamColor, shade palettes
├── features/boost/
│   ├── hooks/useBoostPickups.js
│   ├── transforms/
│   │   ├── buildPads.js
│   │   ├── buildPlayers.js
│   │   └── buildMetrics.js
│   ├── charts/FieldPickupMap.jsx
│   └── components/
│       ├── PlayerHeatmapCard.jsx
│       ├── TeamHeatmapColumns.jsx
│       ├── BoostPickupsHeader.jsx
│       ├── HeroMetricsRow.jsx
│       ├── PadTypeFilter.jsx
│       ├── HeatScaleLegend.jsx
│       └── HeatmapLegendFooter.jsx
├── components/
│   ├── ui/StatBadge.jsx          # generic — reusable beyond boost
│   └── layout/ReplayPage.jsx     # loading/error/upload wrapper for ALL pages
└── pages/BoostPickups.jsx        # ~25 lines, orchestration only
```

Each file is now small, single-purpose, independently testable, and — crucially — the `lib/` and `ReplayPage` pieces are reused across every other page instead of being re-typed.

> **Don't over-fragment.** The goal isn't the most files possible. `HeroMetricsRow` and `PadTypeFilter` only need to be separate if the header is genuinely large or they're reused; if the header stays readable, leaving them inside `BoostPickupsHeader` is fine. Extract when a piece is repeated, reused, or makes its parent hard to read — not reflexively.

---

## A pragmatic order of attack

Don't try to restructure everything at once. Refactor incrementally — the signals to keep going are folder bloat and files that are slow to navigate.

1. **Create the folder skeleton** (`features/`, `components/ui/`, `components/layout/`, `hooks/`, `lib/`, `services/`).
2. **Set up the path alias** so subsequent moves are cheap.
3. **Build shared primitives first** — `Button`, `Card`, `Spinner`, `PageLayout`. These unblock every page.
4. **Pick your most bloated page and gut it**: extract data into a hook, charts into chart components, repeated markup into feature components. Leave the page as pure orchestration.
5. **Extract the API/fetch layer** while you're in there; optionally adopt TanStack Query.
6. **Repeat page by page.** Each refactored page makes the next one faster because the shared components already exist.

---

## Checklist for "is this file done?"

- [ ] The file fits on one or two screens.
- [ ] **No pure logic in the page** — constants, math, coordinate/geometry helpers, and data transforms live in `lib/` or `transforms/`, not in the `.jsx` file. If a block has no JSX, it shouldn't be here.
- [ ] No raw `fetch`/`useEffect` data-fetching inside a page — it's in a hook.
- [ ] Repeated cross-page scaffolding (loading/error/empty states) is a shared wrapper, not re-typed per page.
- [ ] No repeated JSX blocks — they're a component rendered over a list.
- [ ] No chart config inline — it's in a `*Chart` component.
- [ ] No `three.js` setup inline — it's in a scene component with cleanup.
- [ ] Shared UI uses `components/ui/` primitives, not copy-pasted Tailwind classes.
- [ ] Imports use `@/` aliases, not `../../../`.
- [ ] The page reads top-to-bottom like a list of named sections.
