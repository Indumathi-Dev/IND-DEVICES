# IND-DEVICES — Single-SPA MFE with WCAG 2.2 AI Agent

A production-pattern micro-frontend monorepo (mirrors DTIAS/FLCM-GUI) with three
independently-deployable MFEs built on **Chakra UI**, fully compliant with
**WCAG 2.2 Level AA**, and augmented by an **AI accessibility audit agent** that
inspects each component at runtime using Claude.

```
IND-DEVICES/
├── root-config/               single-spa orchestrator (SystemJS + import-map)
├── server/                    Express BFF — WCAG AI audit agent (Anthropic SDK)
├── packages/ind-shared/       Auth service, mock APIs, useWcagAudit hook, WcagAuditPanel
└── apps/
    ├── login/                 Chakra UI sign-in form
    ├── dashboard/             Highcharts fleet overview (KPIs + 3 charts)
    └── devices/               Full CRUD table with pagination (Chakra Table + AlertDialog)
```

---

## Quick start

```bash
npm install              # installs all workspaces
cp server/.env.example server/.env
# Edit server/.env and add your ANTHROPIC_API_KEY for AI-powered audits
# (the app works without a key using static rule checks)

npm start                # starts all 5 processes (server + 4 webpack-dev-servers)
```

Open **http://localhost:9000** — sign in with `admin` / `admin@123!`

| Process       | Port | Role                                    |
|---------------|------|-----------------------------------------|
| agent-server  | 8090 | WCAG AI audit BFF (Anthropic SDK)       |
| root-config   | 9000 | single-spa orchestrator + host HTML     |
| login         | 8081 | Login MFE                               |
| dashboard     | 8082 | Dashboard MFE                           |
| devices       | 8083 | Devices MFE                             |

---

## WCAG 2.2 AI Agent

A **♿ A11y Audit** button is fixed to the bottom-right of every screen.
Clicking it opens a Chakra Drawer that:

1. **Inspects the live DOM** — walks the component's tree, collecting inputs,
   buttons, images, tables, heading levels, focus indicators, and target sizes.
2. **Runs static checks** — ~10 deterministic WCAG 2.2 rules (always available,
   no API key needed).
3. **Calls Claude** — sends the structured DOM info (never raw HTML) to the agent
   server, which calls `claude-sonnet-4-6` for deeper reasoning on contrast,
   reflow, keyboard navigation, focus appearance (2.4.11), and target size (2.5.8).
4. **Renders issues** — each finding shows criterion number, level (A/AA),
   principle, severity badge, element, description, and a concrete Chakra UI fix.
5. **Shows a score** — 0–100 (deducted per severity: critical −20, serious −12,
   moderate −6, minor −2).

The agent degrades gracefully: no key → static results; server down → offline
message. The UI never breaks.

---

## WCAG 2.2 coverage map

| Criterion | Title                     | Where implemented                                      |
|-----------|---------------------------|--------------------------------------------------------|
| 1.1.1     | Non-text Content          | Chart `aria-description`; visually-hidden data tables  |
| 1.3.1     | Info and Relationships    | `<Table>` with `<caption>` + `scope="col"`; FormLabel  |
| 1.3.5     | Identify Input Purpose    | `autocomplete="username"` / `"current-password"`        |
| 1.4.1     | Use of Color              | Status = badge text + dot, never colour alone          |
| 1.4.3     | Contrast (Minimum)        | Chakra default palette ≥4.5:1; verified by agent       |
| 1.4.4     | Resize Text               | rem/em units throughout Chakra theme                   |
| 1.4.10    | Reflow                    | Flex/Grid responsive layout; agent checks              |
| 1.4.11    | Non-text Contrast         | Border/focus ring ≥3:1; agent checks                   |
| 2.1.1     | Keyboard                  | All Chakra components keyboard-operable; Modal focus trap|
| 2.4.1     | Bypass Blocks             | Skip link in root-config HTML + in-page link on Login  |
| 2.4.3     | Focus Order               | Focus moved to heading on page load (useRef + focus()) |
| 2.4.6     | Headings and Labels       | h1 on every page; FormLabel on every input             |
| 2.4.7     | Focus Visible             | `_focusVisible` ring on all interactive elements       |
| **2.4.11**| **Focus Appearance** ★    | 2px outline + 3:1 contrast ring on every control       |
| 2.5.3     | Label in Name             | Row action buttons: "Edit device Cell-Site-001"        |
| **2.5.8** | **Target Size** ★         | All buttons ≥32px; icon buttons minH/minW="28px"       |
| 3.2.6     | Consistent Help           | WCAG badge + nav item in same position on every screen |
| 3.3.1     | Error Identification      | `FormErrorMessage` with `role="alert"`; text, not colour|
| 3.3.2     | Labels or Instructions    | `FormHelperText` on every complex input                |
| **3.3.8** | **Accessible Auth** ★     | Show/hide password toggle removes cognitive barrier    |
| 4.1.2     | Name, Role, Value         | `role="dialog"` + `aria-modal` via Chakra Modal/AlertDialog|
| 4.1.3     | Status Messages           | Toast with `aria-live`; loading spinner role="status"  |

★ = new in WCAG 2.2

---

## Adding a new MFE

1. `mkdir -p apps/my-app/src`
2. Copy `apps/devices/package.json` + `webpack.config.js` + `babel.config.json`, update name/port
3. Wrap root component in `<ChakraProvider>` + `<AppShell>`
4. Add `useWcagAudit` + `<WcagAuditPanel>` to the page component
5. Register in `root-config/src/ind-devices-root-config.js`
6. Add entry to the import map in `root-config/src/index.ejs`
