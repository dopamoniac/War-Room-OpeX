# LEONI OPEX War Room - Menzel Hayet

## Overview
Professional Operation Excellence Management System for automotive wiring harness manufacturing at the LEONI Menzel Hayet plant. Dark industrial UI with 9 modules covering the full OPEX management lifecycle.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Express.js (minimal - primarily serves frontend)
- **Storage**: localStorage for all data persistence (no database for MVP)
- **Routing**: wouter for client-side routing
- **i18n**: French (fr) and Arabic (ar) with RTL support

## Modules
1. **War Room** (`/`) - SQDCM cockpit dashboard with gauges, KPI overview, charts
2. **KPI Studio** (`/kpi`) - Advanced KPI visualization with 4 tabs: Overview (SQDCM summary cards, bar chart, radar), Chart Studio (configurable chart grid supporting Bar/Line/Pie/Area/Stacked Bar; per-card config: title, categories, department, aggregation, color palette, legend, axis labels; export PNG/SVG/PDF/Print per chart; add/remove/switch type), KPI Data (filterable table with trend delta, CRUD), Report (full PDF/print report with SQDCM summary + embedded charts + KPI table). Uses html-to-image + jspdf for high-quality exports.
3. **Abnormality & Actions** (`/abnormality`) - Full A3 Problem-Solving system. Abnormality cards expand into a 7-step investigation panel: (1) QQOQCCP structured problem definition (Qui/Quoi/Où/Quand/Comment/Combien/Pourquoi), (2) Pareto Analysis (interactive bar+cumulative chart with 80/20 highlighting, cause data entry), (3) Ishikawa 6M Fishbone Diagram (Man/Machine/Method/Material/Measurement/Milieu panels with editable cause lists), (4) 5 Pourquoi Root Cause Analysis (sequential inputs with root cause statement), (5) Plan PDCA with 4-quadrant layout (Plan/Do/Check/Act actions with owner, deadline, status, progress), (6) Monitoring (resolution time, PDCA completion rate, 6-month trend chart, status distribution pie), (7) Chronologie timeline. Full A3 report export as PDF/Print. All A3 data stored per-abnormality in localStorage. Schema extended with A3Data types (shared/schema.ts).
4. **CI/Kaizen Hub** (`/ci`, `/ci/kaizen/:id`) - Digital Kaizen Card System with 4 tabs (Overview, Ideas, Board, Cards), full card editing with before/after photos, impact metrics, validation workflow, reward points/leaderboard, A4 print export
5. **VSM Studio** (`/vsm`) - Fully interactive VSM editor with 3 tabs (Poster/Current/Future). Poster tab: editable industrial VSM poster with drag-and-drop, inline editing, zoom, print/PDF. Current State tab: process step cards with automatic Lean waste detection (bottlenecks, excess WIP, low uptime, high scrap), visual waste indicators above steps, right-side AI Waste Detection Panel listing all detected wastes, and Lean Improvement Suggestions panel. Future State tab: click-to-edit step fields (C/T, operators, WIP, LT, PT), "Copy Current to Future" button, comparison summary bar showing Current vs Future delta for Lead Time, Process Time, and PCE ratio
6. **Project Portfolio** (`/portfolio`, `/portfolio/:id`) - Full OPEX CI project management with Overview/Projects tabs. Project detail has 3 tabs: Overview (team, financials, risks, actions, sustainment, governance export), WBS Structure (toggle between **List View** and **Diagram View**; List: 5-level hierarchy collapsible tree with drag-and-drop reorder, inline editing, full CRUD; Diagram: auto-layout tree with SVG elbow connectors, color-coded nodes by level, click-to-select action buttons for add child/rename/delete, double-click inline rename, shared data between both views), Gantt Timeline (auto-generated from WBS hierarchy, interactive bars with drag-to-move and resize-to-change-duration, FS/SS/FF dependency links shown as dashed lines, day/week/month time scales, today marker, progress overlay on bars, parent aggregate markers)
7. **Report Center** (`/reports`) - Report generation and history
8. **File Sharing** (`/files`) - File upload, search, categorization
9. **Admin** (`/admin`) - Data management, export/import, system reset

## AI Co-Pilot Layer
A fully integrated rule-based AI engine accessible from every page:
- **`client/src/lib/ai-engine.ts`** - Deterministic AI engine analyzing KPIs (trends, spikes, achievement), abnormalities (root-cause confidence), overdue actions, VSM wastes (bottlenecks, WIP, uptime), and projects (health/risk). Outputs: alerts, insights, recommendations, daily summary, draft generators.
- **`client/src/components/ai-copilot-panel.tsx`** - Right-side panel (4 tabs: Insights, Recommendations, Drafts, Alerts). Opened via "AI Co-Pilot" button in top bar.
- **`client/src/components/ai-alerts-center.tsx`** - Full-screen alerts modal with level/module filtering, per-alert acknowledge/snooze/assign. Opened via bell icon in top bar.
- **`client/src/components/ai-insight-card.tsx`** - Per-module summary card shown at top of every page content area. Displays top alert, insight count, and "Open Co-Pilot" shortcut.

## Key Files
- `shared/schema.ts` - All TypeScript types and constants
- `client/src/lib/translations.ts` - i18n (FR/AR)
- `client/src/lib/storage.ts` - localStorage wrapper
- `client/src/lib/initial-data.ts` - Seed data for demo
- `client/src/components/app-sidebar.tsx` - Navigation sidebar
- `client/src/pages/` - All 9 module pages
- `client/src/App.tsx` - Main app with routing

## Design
- Dark-only theme (near-black background, zinc text, blue-600 accent)
- Glass morphism panels (backdrop-blur, semi-transparent backgrounds)
- Industrial/manufacturing aesthetic
- SQDCM framework (Safety, Quality, Delivery, Cost, Morale)
- French by default with Arabic RTL toggle

## Data Persistence
All data stored in localStorage under keys prefixed with `leoni-`. No backend database required. Data can be exported/imported via Admin module as JSON.
