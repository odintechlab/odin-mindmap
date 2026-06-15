# Odin Mindmap

A Next.js app that visualizes your ClickUp workspace as an interactive mind map.

## Setup

1. Copy the example env file and add your ClickUp token:

```bash
cp .env.example .env.local
```

2. Set `CLICKUP_TOKEN` in `.env.local` (starts with `pk_`).

   Get it from: ClickUp → Avatar → Settings → Apps → API Token

3. Install dependencies and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Hierarchy view** — Workspace → Space → Folder → List → Task → Subtask
- **Lazy loading** — Children load on expand; large lists prompt before fetching
- **Task details** — Status, priority, due date, assignees on each node
- **Inline editing** — Rename tasks, update status and priority (syncs to ClickUp)
- **Navigation** — Zoom, pan, fit-to-view, center selected node
- **Keyboard shortcuts** — `+`/`-` zoom, `0` fit, `f` center, `Enter` expand, `Esc` deselect
- **Dark mode** — Toggle in toolbar (persists in localStorage)

## Architecture

```
src/
├── app/                  # Next.js routes + API handlers
├── components/
│   ├── mindmap/          # Canvas, toolbar, detail panel, nodes
│   └── ui/               # Small UI primitives
├── lib/
│   ├── clickup/          # ClickUp API client + transforms
│   └── mindmap/          # Graph building + dagre layout
├── types/                # Shared TypeScript types
└── hooks/                # Keyboard shortcuts
```

**Data flow:** Client canvas → `/api/clickup/*` route handlers → ClickUp API v2. The API token never leaves the server.

**State:** All UI state lives in `MindMapCanvas` — expanded nodes, selection, and a client-side cache. No external state library.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@xyflow/react` | Pan, zoom, custom nodes, graph rendering |
| `dagre` | Hierarchical tree layout |

Everything else uses Next.js, React, and Tailwind CSS.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLICKUP_TOKEN` | Yes | Personal API token from ClickUp settings |
