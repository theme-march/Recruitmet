# ORBIT Mobile 2027 — audit and implementation plan

## Existing product

- The source product is Next.js 16 with React 19, server routes under `src/app/api`, Prisma data, session cookies, and role/module permissions.
- The Expo SDK 57 project at `../Recruitmet-App` is a React Native WebView shell. It renders this web product, so mobile UI changes belong in this repository unless the entire feature set is ported to native screens.
- The route inventory has 31 page files. Dynamic module routes expose candidate intake, interviews, country processing, demands, agents, payments, documents, country setup, tutorials, reports, and administration.
- The existing Figma file has 225 mobile artboards across nine screen pages. It has no local variables or components. Screen content is positioned absolutely and repeats templates across different workflows.

## UX problems found

1. Bottom navigation labels and destinations conflict: Dashboard is labelled “Pipelines”, payments activate the Demands tab, and Dubai/Other Country routes do not activate Routing. Its links are not filtered by role permissions.
2. Repeated card templates obscure the difference between a candidate, payment, demand, document, and country stage. Small 10–12 pt metadata and status pills make scanning difficult.
3. Mobile styling is split across a 3,000-line override sheet and later module sheets, with repeated `!important` rules. Shared controls lack one dependable size and spacing scale.
4. Figma artboards use fixed 390 × 844 layouts, absolute layers, manual status bars, and no reusable components, Auto Layout, or light/dark semantic tokens.
5. Loading, empty, validation, error, disabled, and success states are incomplete or inconsistent across the screen inventory.

## Design direction

- Preserve the ORBIT blue identity. Use restrained blue accents, a neutral canvas, high-contrast text, and status colors only for meaningful states. Avoid decorative gradients in task surfaces.
- Give each workflow a distinct hierarchy: metric dashboard; compact searchable records; stage progress and queue; amount-first finance; document preview and verification; identity-first dossier; short sectioned forms.
- Use a role-aware five-destination mobile navigation with a correct active state, clear labels, and a full menu for less frequent modules. Keep back navigation within dossiers and forms.
- Standardize 8 pt spacing, 16 pt card radius, 12 pt control radius, 48 pt touch controls, 16 pt body text, and readable 12–13 pt secondary text.
- Support widths from 320 pt to large phones, system safe areas, keyboard visibility, focus outlines, and reduced motion.

## Figma system inventory

- Semantic color variables with Light and Dark modes: canvas, surface, elevated surface, text, muted text, border, accent, success, warning, danger, and their soft backgrounds.
- Spacing and radius variables; type styles for display, page title, section title, body, label, and caption.
- Components: top bar, bottom tab, primary/secondary/destructive buttons, input/select, search, filter chip, status badge, metric tile, record row, empty state, error state, loading skeleton, and action bar. Variants cover focus, disabled, loading, selected, success, warning, and error where relevant.
- Screen families: authentication; office/agent/admin dashboards; candidate and agent lists; country stage queue and record; payment list/receipt; demand list/detail; document list/viewer; dossier; reports; settings and permissions; forms and filters.

## Implementation map

| Design family | Existing code |
| --- | --- |
| Shell and navigation | `src/components/layout/app-shell.tsx`, `src/app/mobile-design-system.css` |
| Dashboard | `src/components/modules/dashboard.tsx`, `src/components/modules/officer-dashboard-page.tsx` |
| Candidates and dossier | `src/components/modules/all-candidates-list-page.tsx`, `src/components/modules/file-processing-workspace.tsx` |
| Country stages | `src/components/modules/country-candidates-list-page.tsx`, `src/components/ksa/*` |
| Demands and agents | `src/components/modules/works-demands-page.tsx`, `src/components/modules/agents-page.tsx` |
| Finance and documents | `src/components/modules/payment-collection-page.tsx`, `src/components/modules/dubai-documents-page.tsx` |
| Interviews, reports, admin | Their existing `src/components/modules/*` views and shared responsive rules |

APIs, session handling, Prisma models, and permission checks remain the source of truth. The mobile redesign changes presentation and navigation only.

## Acceptance checks

- Every existing route and country stage remains reachable for an authorized role.
- Figma includes editable, Auto Layout mobile screens and reusable component instances for the whole inventory, plus key loading/empty/error/form states.
- Mobile implementation renders at 320, 390, and 430 px without horizontal scrolling or covered actions.
- Sign-in, bottom navigation, search, forms, validation, error handling, and session navigation are exercised against the existing app.
