# logstream-ui

🖥️🔍 Real-time log viewer and search dashboard built with React, Vite and WebSockets.

The companion frontend for [logstream-server](https://github.com/guibranco/logstream-server). Streams live log entries over WebSocket and provides a full-featured search and inspection UI — no build-time configuration required.

---

## Live demo

**[Open the demo, already connected →](https://guilherme.stracini.com.br/logstream-ui/#server=https%3A%2F%2Flogstream-demo.onrender.com&secret=lsu_Cj4qmrHvWkH3BfMyUn4HELyBsldiprEGZfB0VAOR2S0)**

The link uses a [connection link](#sharing-a-connection-link): the settings screen opens pre-filled with the
demo server and its UI secret, so just click **Validate and Connect**.

To set it up by hand instead, open <https://guilherme.stracini.com.br/logstream-ui/> and, on the
**Connection Settings** screen, enter:

| Field | Value |
|-------|-------|
| **API Base URL** | `https://logstream-demo.onrender.com` |
| **WebSocket URL** | `wss://logstream-demo.onrender.com/ws` |
| **UI Secret** | `lsu_Cj4qmrHvWkH3BfMyUn4HELyBsldiprEGZfB0VAOR2S0` |

The demo server fills itself with fake traffic from *ShopFast*, a made-up shop of six services, every time it
starts, so there are events, traces and every log level to explore right away. To generate more, open
**<https://logstream-demo.onrender.com/demo>**: run a scenario (a checkout, a declined card, a gateway timeout…)
up to 50 times, backfill the last few hours, or turn on continuous mode while the page is open.

![The demo server's /demo page: scenario buttons, backfill and continuous mode, and the activity list](docs/screenshots/desktop-demo-traffic.png)

To send your own entries instead, use the write key
`API_SECRET=lsa_fFWu1hWJ19kr_1g9maLswqk4tNCh-24qhv8s2eSMbVs`:

```bash
curl -X POST https://logstream-demo.onrender.com/api/logs \
  -H "Authorization: Bearer lsa_fFWu1hWJ19kr_1g9maLswqk4tNCh-24qhv8s2eSMbVs" \
  -H "Content-Type: application/json" \
  -d '{"app_key":"demo","app_id":"readme","level":"info","category":"test","message":"Hello from the README"}'
```

With the UI open, the entry shows up live.

> ⚠️ **Demo only.** The server runs on Render's free plan: it spins down after 15 minutes without traffic,
> and the first request after that takes about a minute to wake it — if the UI can't connect, wait and
> reload. Logs are lost on every redeploy, restart or spin-down, and entries older than 1 day are deleted.
> The keys are public, and the `UI_SECRET` also manages retention, so anyone can edit the demo's policies or delete
> its logs — **don't send real or personal data**.

---

## Features

- **Real-time log stream** — new entries appear instantly via WebSocket, with a live/buffered toggle and slide-in animation
- **Full-text search and filters** — filter by application, environment, level, category, trace ID, batch ID, date range, or message substring, all persisted across page refreshes
- **Expandable rows** — click any entry to reveal the full message, context as a searchable property list (Find / Exclude per value), user agent, sender IP, and one-click batch/trace navigation
- **Applications** — register the services that send logs, edit them, rotate or reveal-once their API tokens, and deactivate or delete them (servers with client management)
- **Retention** — storage-by-age chart with a marker per policy, policy editor, and dry or live retention runs with per-policy results
- **Stats drawer** — session-level counts by log level, top apps by volume, and total entries received
- **Row virtualisation** — large result sets (200+ rows) are windowed for smooth scrolling
- **Zero build-time config** — all connection settings (API URL, WebSocket URL, UI secret) are entered via a settings screen and stored in `localStorage`; no `.env` file required
- **Auth-aware** — separate UI key (`UI_SECRET`) and write key (`API_SECRET`) enforced by the backend; 401 responses and WebSocket auth failures redirect to the settings screen without retry loops
- **Themes** — 16 themes (Blue, Green, Red, Orange, Pink, Violet, Indigo, Ocean, Graphite, Sepia, Lime, Catppuccin, Solarized, Nord, Dracula and High contrast), each with a light and a dark variant (or following the system), picked from the 🎨 button and remembered per browser; new themes are one file each

---

## Screenshots

Taken with sample events against a mocked server, in the default (Green, dark) theme; every theme is shown under [Themes](#themes). To retake them, see [Retaking the screenshots](#retaking-the-screenshots).

### Events

**Live events**, filtered to errors and critical events:

![Events page on desktop: header, filter bar and the event table](docs/screenshots/desktop-events.png)

**Expanded event**, with the full message, context properties (Find / Exclude / Copy per value) and batch and trace links:

![An expanded event on desktop](docs/screenshots/desktop-expanded-event.png)

**Exception**, from `context.exception`, with the stack trace and the inner exception after `--->` (see [Logging exceptions](#logging-exceptions)):

![An expanded error event showing the exception panel with its stack trace](docs/screenshots/desktop-exception.png)

**Advanced filters**, for context text, `key = value` context filters and message templates:

![The advanced filters section open on desktop](docs/screenshots/desktop-advanced-filters.png)

**Trace**, every event with the same trace ID, after **View trace**:

![Events filtered by one trace ID](docs/screenshots/desktop-trace.png)

**Copy several events**: tick the checkboxes, Ctrl/⌘+click or Shift+click a range (long-press on a phone), or Ctrl/⌘+A for every loaded event, then copy them oldest first as log lines (Ctrl/⌘+C), Markdown or JSON. The live feed holds while you select; Esc clears:

![Four events selected with the copy bar at the bottom](docs/screenshots/desktop-selection.png)

**Paused**, new events held above the list until you resume:

![The live feed paused with four new events waiting](docs/screenshots/desktop-paused.png)

| Date range | Application picker |
|:---:|:---:|
| <img src="docs/screenshots/desktop-date-range.png" alt="Date range picker with relative presets and a custom range" width="420"> | <img src="docs/screenshots/desktop-app-picker.png" alt="Application picker with two apps selected" width="420"> |
| Relative presets (last 5 minutes to last 365 days, this week, this month) or a custom from / to | Pick one or several registered applications (several need a server with multi-value filters) |

| Stats drawer | Theme picker |
|:---:|:---:|
| <img src="docs/screenshots/desktop-stats.png" alt="Stats drawer with counts per level and top app keys" width="420"> | <img src="docs/screenshots/desktop-theme-picker.png" alt="Theme picker with mode and theme list" width="420"> |
| Counts per level, top app keys and total entries of this session | Light, dark or system mode and the 16 themes |

### Applications

Registers the services allowed to send logs and manages their API tokens. Shown when the server has client management (MariaDB storage).

![Applications page listing registered services with their status](docs/screenshots/desktop-applications.png)

| Register an application | Token shown once |
|:---:|:---:|
| <img src="docs/screenshots/desktop-register-app.png" alt="Register application form" width="420"> | <img src="docs/screenshots/desktop-token-reveal.png" alt="New API token shown once after registering" width="420"> |
| Display name and app key, with a preview of the `X-Api-Key` header | The API token is shown only once, after registering or rotating |

### Retention

Storage by age, with a marker for each policy's cutoff, the share of stored entries each policy matches and what is due for deletion:

![Retention page with the storage-by-age chart and policy markers](docs/screenshots/desktop-retention.png)

In the **Size** view on a MariaDB server, the chart becomes Seq-style: each day stacks its estimated **data** (green) and **indexes** (amber) on disk, with the part policies would delete striped. Above it, an **On disk** bar shows the log table's real data and index sizes from `information_schema`; each day's split is estimated from them (data by its share of payload bytes, indexes by its share of entries), so the days add up to the table total:

![Storage by age in Size mode: per-day data and index size stacked, with a day's tooltip](docs/screenshots/desktop-retention-size.png)

| Dry run | New policy |
|:---:|:---:|
| <img src="docs/screenshots/desktop-retention-run.png" alt="Retention dry run results per policy" width="420"> | <img src="docs/screenshots/desktop-policy-form.png" alt="New retention policy form" width="420"> |
| Simulate a run to see how many entries each policy would delete, then run it for real | Age, level, app, environment, category and message regex / glob criteria, with a summary |

### Settings

The connection settings screen, shown on first visit and from ⚙:

![Connection settings screen](docs/screenshots/desktop-settings.png)

### Phone

Below 768 px, the filters fold behind a **Filters** button that counts the active ones, events become two-line cards, and the columns that don't fit move into the expanded event.

| Events | Filters open | Expanded event |
|:---:|:---:|:---:|
| <img src="docs/screenshots/mobile-events.png" alt="Events page on a phone" width="260"> | <img src="docs/screenshots/mobile-filters.png" alt="Filters open on a phone" width="260"> | <img src="docs/screenshots/mobile-expanded-event.png" alt="An expanded event on a phone" width="260"> |

| Retention | Applications |
|:---:|:---:|
| <img src="docs/screenshots/mobile-retention.png" alt="Retention page on a phone" width="260"> | <img src="docs/screenshots/mobile-applications.png" alt="Applications page on a phone" width="260"> |

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS (no component library) |
| Data fetching | TanStack Query (react-query) |
| Date formatting | date-fns |
| State | React Context + `useState` (no Redux) |
| Config persistence | `localStorage` |

---

## Getting started

### Prerequisites

- Node.js 18 or later
- A running [logstream-server](https://github.com/guibranco/logstream-server) instance

### Install and run

```bash
git clone https://github.com/guibranco/logstream-ui.git
cd logstream-ui
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. On first load you will see the **Connection Settings** screen.

---

## Configuration

There are no `.env` files or build-time variables. All settings are entered once via the UI and stored in your browser's `localStorage` under the key `logservice:config`.

### Settings screen

The settings screen appears automatically on first visit and can be re-opened at any time from the ⚙ button in the header.

| Field | Description | Example |
|-------|-------------|---------|
| **API Base URL** | The logstream-server HTTP address | `https://logs.straccini.com` |
| **WebSocket URL** | The WebSocket endpoint | `wss://logs.straccini.com/ws` |
| **UI Secret** | The UI bearer token (`UI_SECRET` from the server's `.env`); not read-only, see [Authentication model](#authentication-model) | `your-ui-secret-here` |

The two URLs pre-fill each other: typing the API URL fills in the WebSocket URL (`https://foo.com` → `wss://foo.com/ws`, keeping any path prefix such as `/logstream`), and typing the WebSocket URL fills in the API URL (`wss://foo.com/ws` → `https://foo.com`). A field is only filled automatically while it is empty or still holds an auto-filled value — once you type in it yourself, it is kept as you wrote it. Clearing a field makes it auto-fill again.

> **Security note:** The UI secret is stored in `localStorage` so it survives browser restarts. It is sent as a `Bearer` token in `Authorization` headers for HTTP requests and as a `?token=` query parameter on the WebSocket connection URL (browser WebSocket APIs do not support custom headers). It is never included in the visible browser address bar.

### Sharing a connection link

A link can carry the connection settings, so someone can open the UI already pointed at your server:

```
https://guilherme.stracini.com.br/logstream-ui/#server=logs.example.com&secret=lsu_xxxxxxxx
```

| Parameter | Description |
|-----------|-------------|
| `server` (or `domain`, `api`) | API base URL, or a bare domain (`https://` is assumed) |
| `ws` | WebSocket URL — only needed when it isn't the one derived from `server` (`wss://<server>/ws`) |
| `secret` | The UI secret (`UI_SECRET`) |

- Put the parameters after `#` (the fragment): browsers never send it to the web server, so the secret stays out of access logs and `Referer` headers. The same parameters in the query string (`?server=…`) also work, but are not recommended for the secret.
- Opening the link shows the settings screen pre-filled, with a notice. Nothing is saved until you click **Validate and Connect**; **Close** keeps your current settings. A link that names a different server without a `secret` does not reuse your saved secret.
- The parameters are removed from the address bar as soon as the page loads; filters in the query string are kept.
- To make a link, open ⚙ **Settings** → **Copy share link**. Untick **Include UI secret in the link** to share only the server. Anyone with a link that includes the secret can read your logs and change or run your retention policies.

### Clearing settings

Open ⚙ **Settings** → scroll to the bottom → **Clear all saved settings and disconnect**. Confirm the dialog to wipe the config and return to the blank settings form.

Alternatively, click **Disconnect** in the header to clear and return to the settings screen immediately.

---

## Authentication model

The backend enforces two separate keys — the UI only ever uses the UI key, never the write key:

| Key | Who uses it | What it protects |
|-----|-------------|-----------------|
| `API_SECRET` (write key) | Your backend services | `POST /api/logs` |
| `UI_SECRET` (UI key) | This UI | `GET /api/logs`, `GET /api/logs/:id`, WebSocket, and retention and client management (`/api/retention/*`, `/api/clients/*`) |

The `UI_SECRET` is **not read-only**: anyone holding it can edit and run retention policies (which delete logs) and manage client tokens. Keep it as private as the write key, and only share a link that includes it with people you trust.

The health endpoint (`GET /api/health`) is public and requires no token.

### WebSocket auth

The UI connects to `wss://host/ws?token=<UI_SECRET>`. On success the server sends `{ type: "connected" }`. If the token is wrong the server sends `{ type: "error" }` and closes the connection — the UI detects this and shows a persistent error banner **without retrying** (to avoid an infinite auth-fail loop).

### HTTP 401 handling

Any `401` response clears the stored config and redirects to the settings screen with the message *"Session expired or secret rejected — update your settings."*

---

## Themes

The 🎨 button in the header (also on the settings screen) picks the theme and the mode: **Light**, **Dark** or **System** (follows the operating system, switching live). The choice is stored in `localStorage` under `logservice:theme`; the default is Green, dark. A small script in `index.html` re-applies the last theme before the app loads, so a light theme does not flash dark.

| Theme | Neutral | Primary (buttons, links, focus) | Secondary (filters, highlights) |
|-------|---------|----------------------------------|----------------------------------|
| Blue | `gray` | `blue` | `sky` |
| Green (default) | `zinc` | `emerald` | `green` |
| Red | `stone` | `red` | `rose` |
| Orange | `stone` | `orange` | `amber` |
| Pink | `mauve` | `pink` | `fuchsia` |
| Violet | `slate` | `violet` | `purple` |
| Indigo | `slate` | `indigo` | `violet` |
| Ocean | `mist` | `teal` | `cyan` |
| Graphite | `neutral` | `neutral` | `zinc` |
| Sepia | `taupe` | `amber` | `yellow` |
| Lime | `olive` | `lime` | `yellow` |
| Catppuccin | Mocha / Latte | mauve | blue |
| Solarized | base03…base3 | blue | cyan |
| Nord | Polar Night / Snow Storm | Frost (nord9, nord10) | Frost (nord8) |
| Dracula | Dracula / Alucard | purple | pink |
| High contrast | black / white | `blue` | `cyan` |

Catppuccin, Solarized, Nord and Dracula use their official hex values (light variants: Catppuccin Latte, Solarized light, Dracula's Alucard; Nord has no official light variant, so its light one uses Snow Storm for the page and Polar Night for text).

### Gallery

The events page with an expanded error event, in each theme:

| Theme | Light | Dark |
|-------|:-----:|:----:|
| **Blue** | <img src="docs/screenshots/themes/blue-light.png" alt="Blue theme, light" width="400"> | <img src="docs/screenshots/themes/blue-dark.png" alt="Blue theme, dark" width="400"> |
| **Green (default)** | <img src="docs/screenshots/themes/green-light.png" alt="Green theme, light" width="400"> | <img src="docs/screenshots/themes/green-dark.png" alt="Green theme, dark" width="400"> |
| **Red** | <img src="docs/screenshots/themes/red-light.png" alt="Red theme, light" width="400"> | <img src="docs/screenshots/themes/red-dark.png" alt="Red theme, dark" width="400"> |
| **Orange** | <img src="docs/screenshots/themes/orange-light.png" alt="Orange theme, light" width="400"> | <img src="docs/screenshots/themes/orange-dark.png" alt="Orange theme, dark" width="400"> |
| **Pink** | <img src="docs/screenshots/themes/pink-light.png" alt="Pink theme, light" width="400"> | <img src="docs/screenshots/themes/pink-dark.png" alt="Pink theme, dark" width="400"> |
| **Violet** | <img src="docs/screenshots/themes/violet-light.png" alt="Violet theme, light" width="400"> | <img src="docs/screenshots/themes/violet-dark.png" alt="Violet theme, dark" width="400"> |
| **Indigo** | <img src="docs/screenshots/themes/indigo-light.png" alt="Indigo theme, light" width="400"> | <img src="docs/screenshots/themes/indigo-dark.png" alt="Indigo theme, dark" width="400"> |
| **Ocean** | <img src="docs/screenshots/themes/ocean-light.png" alt="Ocean theme, light" width="400"> | <img src="docs/screenshots/themes/ocean-dark.png" alt="Ocean theme, dark" width="400"> |
| **Graphite** | <img src="docs/screenshots/themes/graphite-light.png" alt="Graphite theme, light" width="400"> | <img src="docs/screenshots/themes/graphite-dark.png" alt="Graphite theme, dark" width="400"> |
| **Sepia** | <img src="docs/screenshots/themes/sepia-light.png" alt="Sepia theme, light" width="400"> | <img src="docs/screenshots/themes/sepia-dark.png" alt="Sepia theme, dark" width="400"> |
| **Lime** | <img src="docs/screenshots/themes/lime-light.png" alt="Lime theme, light" width="400"> | <img src="docs/screenshots/themes/lime-dark.png" alt="Lime theme, dark" width="400"> |
| **Catppuccin** | <img src="docs/screenshots/themes/catppuccin-light.png" alt="Catppuccin theme, light" width="400"> | <img src="docs/screenshots/themes/catppuccin-dark.png" alt="Catppuccin theme, dark" width="400"> |
| **Solarized** | <img src="docs/screenshots/themes/solarized-light.png" alt="Solarized theme, light" width="400"> | <img src="docs/screenshots/themes/solarized-dark.png" alt="Solarized theme, dark" width="400"> |
| **Nord** | <img src="docs/screenshots/themes/nord-light.png" alt="Nord theme, light" width="400"> | <img src="docs/screenshots/themes/nord-dark.png" alt="Nord theme, dark" width="400"> |
| **Dracula** | <img src="docs/screenshots/themes/dracula-light.png" alt="Dracula theme, light" width="400"> | <img src="docs/screenshots/themes/dracula-dark.png" alt="Dracula theme, dark" width="400"> |
| **High contrast** | <img src="docs/screenshots/themes/high-contrast-light.png" alt="High contrast theme, light" width="400"> | <img src="docs/screenshots/themes/high-contrast-dark.png" alt="High contrast theme, dark" width="400"> |

### How it works

Components use three colour roles, always written for a dark UI:

- `gray-*` — the neutral scale (backgrounds, borders, text; `text-gray-50` is the strongest text)
- `primary-*` — the main accent
- `secondary-*` — the second accent

Status and log-level colours (`red`, `amber`, `green`, `sky` for `info`…) stay Tailwind's own and do not change with the theme. Use `text-white` only on solid coloured buttons (`bg-primary-600`, `bg-red-600`…), never on a neutral surface.

The active theme writes those roles as CSS variables (`--color-gray-950`, `--color-primary-600`…) on `<html>`. For a light variant it flips the scales: the neutral scale end to end (`bg-gray-950` becomes the lightest surface, `text-gray-100` dark text), and accent and status colours around the middle (`-300`/`-400` text becomes `-700`/`-600`, `-900` tints become `-200`, while `-500` to `-700` keep their value so solid buttons look the same in both modes).

### Adding a theme

Add a file to `src/themes/presets/`; it is picked up automatically:

```ts
// src/themes/presets/sunset.ts
import colors from 'tailwindcss/colors';
import { defineTheme } from '../types';

export default defineTheme({
  id: 'sunset',             // stored in preferences; keep it stable
  name: 'Sunset',
  description: 'Stone with rose and amber accents',
  order: 16,                // position in the picker (optional)
  dark: {
    neutral: colors.stone,
    primary: colors.rose,
    secondary: colors.amber,   // optional, defaults to primary
  },
  light: {
    neutral: colors.stone,
    primary: colors.rose,
    secondary: colors.amber,
    overrides: {
      'gray-950': colors.white, // any variable, any CSS colour, applied last
    },
  },
});
```

Give each scale in its natural order (50 lightest, 950 darkest); the light variant is flipped for you. Scales do not have to come from Tailwind: any object with the keys `50` to `950` works. `overrides` sets single variables after the mapping (`'primary-600': 'oklch(52% 0.15 160)'`). `tests/themes/registry.test.ts` checks every preset has complete light and dark variants, and `tests/themes/contrast.test.ts` checks both variants stay readable (white button text and accent text at least 3:1, body text at least 7:1); a light accent such as `amber` or `lime` usually needs `primary-500`/`primary-600` overridden with darker shades to pass.

#### Palettes from outside Tailwind

To use an existing palette's hex values, build the scales with `scale()` from `src/themes/palette.ts`. Give it `50`, `950` and any shades you have; the rest are interpolated:

```ts
import { scale } from '../palette';

const mauve = scale({ '50': '#f6f0fe', '400': '#cba6f7', '600': '#8839ef', '950': '#2b0d55' });
```

A neutral scale can also be written out in full (all eleven shades), as `catppuccin.ts` and `high-contrast.ts` do. Remember the light variant is flipped: its `50` is the page and its `900` the body text.

---

## UI reference

### Header bar

| Element | Description |
|---------|-------------|
| Pulse dot | WebSocket status — green (connected), amber (reconnecting), red (disconnected / auth error) |
| Connection count | Live WebSocket client count from the server |
| **Live** toggle | When ON, new entries prepend in real-time. When OFF, incoming entries buffer and show a *"N new entries"* badge |
| **Clear live** | Clears the in-memory live buffer without affecting search results |
| ⚙ **Settings** | Opens the settings screen pre-filled with current values |
| **Disconnect** | Clears all saved settings and returns to the settings screen |

### Filter bar

All filters are combined and sent as a single `GET /api/logs` query. The filter state persists in `localStorage["logservice:filters"]` across page refreshes and is mirrored in the page URL, so the address bar is a shareable link to the current search. Opening a link that carries filters shows those results instead of the live tail, and takes precedence over the saved filters.

| Filter | Match type |
|--------|-----------|
| Search | Substring on `message` |
| App Key | Exact |
| App ID | Exact |
| Level | Multi-select pills |
| Category | Partial |
| Date From / To | ISO 8601 range |
| Trace ID | Exact |
| Batch ID | Exact |
| Context contains *(Advanced)* | Free text across all context keys and values (`context_search`, min. 3 chars) |
| Context filters *(Advanced)* | `key = value` / `key ≠ value` rows (`context[key]` / `context_not[key]`), dots for nested keys, max. 10 |
| Message template *(Advanced)* | Exact (`message_template`): every event logged from the same template, whatever its values |

**Advanced filters** is a collapsible section under the main filters. It opens automatically when context filters are active. How "Context contains" matches depends on the server storage, and the hint under the field says which mode is active (from `GET /api/info`): MariaDB matches whole words, file storage also matches inside words. Active context and template filters appear as chips; click × on a chip to remove that filter.

### Log table columns

`Timestamp` · `Level` · `App Key` · `App ID` · `Category` · `Message` · `Trace ID` · `Actions`

- **Timestamp** — shown as relative time (*"2 min ago"*); full ISO on hover
- **Level** — colour-coded pill badge (see level colours below)
- **Message** — truncated to 80 chars; full text in expanded row. When the event has a message template, the values rendered into it are coloured by type, as in Seq (strings, numbers, booleans/null, objects), with the property name on hover
- **Trace ID** — first 8 chars + `…`; click to copy the full ID to clipboard
- A 🐞 after the message marks an entry that carries an exception (see [Logging exceptions](#logging-exceptions))

### Expanded row detail

Click any row to reveal:

- Full message text, with template values coloured as in the list
- Exception (when the context has one), with its stack trace and inner exceptions and a copy button; see [Logging exceptions](#logging-exceptions)
- Message template (when the server stored one), placeholders highlighted, with a copy button and **View all with this template**, which filters by it
- `category`, with a copy button and **View all in category**, which filters by it
- `batch_id` — click to auto-fill the Batch ID filter
- `user_agent`
- `sender_ip` — the client IP recorded by the server, with a copy button
- `context` — a property list, one row per value, with nested objects flattened to dotted paths (`order.id`). Each row has:
  - **Find** — show only entries where the property equals this value (`context[order.id]=42`)
  - **Exclude** — hide entries where the property equals this value (`context_not[order.id]=42`)
  - **Copy** — copy the value

  Active context filters appear as chips under the filter bar; click × to remove one. Arrays are shown as JSON and can't be filtered. Requires a logstream-server version with context filters.
- **View all in batch** — sets the batch_id filter and re-runs the search
- **View trace** — sets the trace_id filter and re-runs the search
- **Copy as Markdown** — copies the whole event (summary table, message, template, exception with stack trace, context as JSON) as Markdown, ready to paste into an AI agent or an issue

### Logging exceptions

Like Seq, the UI shows an exception apart from the other properties: under the message, with the type in red, the stack trace below it and each inner exception after a `--->`. LogStream has no dedicated field for it, so the exception goes in the entry's `context` under the key **`exception`**, in either shape:

- **text** — what the runtime prints for the exception, inner exceptions included: `ex.ToString()` in .NET, `(string) $e` in PHP, `err.stack` in Node;
- **object** — `{ "type", "message", "stack_trace", "inner" }`. `stack_trace` is a string or an array of frames (strings, or `{ "class", "function", "file", "line" }`); the inner exception (`inner`, `inner_exception`, `previous` or `cause`) has the same shape, or is text.

Prefer the object: `exception.type` and `exception.message` stay in the property list, so **Find** / **Exclude** work on them (`context[exception.type]=System.TimeoutException`), while the stack traces only appear in the exception panel. Send the entry with level `error` (or `critical`) and keep the message short, as Seq does: the message says what failed, the exception says why.

```http
POST /api/logs
Content-Type: application/json
X-Api-Key: …
X-Api-Token: …

{
  "app_id": "production",
  "level": "error",
  "category": "payments",
  "message": "Charge failed for invoice {invoice_id}",
  "context": {
    "invoice_id": 1234,
    "exception": {
      "type": "System.InvalidOperationException",
      "message": "Gateway refused the charge",
      "stack_trace": "   at Billing.ChargeService.ChargeAsync(Invoice invoice) in /src/Billing/ChargeService.cs:line 42\n   at Billing.Jobs.ChargeJob.RunAsync() in /src/Billing/Jobs/ChargeJob.cs:line 18",
      "inner": {
        "type": "System.Net.Http.HttpRequestException",
        "message": "Response status code does not indicate success: 502 (Bad Gateway).",
        "stack_trace": "   at Billing.GatewayClient.PostAsync(String path) in /src/Billing/GatewayClient.cs:line 77"
      }
    }
  }
}
```

**.NET** — turn the exception into the object, walking `InnerException`:

```csharp
static Dictionary<string, object?>? ToLogException(Exception? ex, int depth = 0) =>
    ex is null || depth >= 10
        ? null
        : new()
        {
            ["type"] = ex.GetType().FullName,
            ["message"] = ex.Message,
            ["stack_trace"] = ex.StackTrace,
            ["inner"] = ToLogException(ex.InnerException, depth + 1),
        };

try
{
    await chargeService.ChargeAsync(invoice);
}
catch (Exception ex)
{
    await logStream.SendAsync(new
    {
        app_id = "production",
        level = "error",
        category = "payments",
        message = "Charge failed for invoice {invoice_id}",
        context = new Dictionary<string, object?>
        {
            ["invoice_id"] = invoice.Id,
            ["exception"] = ToLogException(ex),
        },
    });
    throw;
}
```

For an `AggregateException`, log `ex.Flatten().InnerExceptions` one entry each, or send `ex.ToString()` as text, which lists them all.

**PHP** — the same with `getPrevious()`; `getTrace()` gives the frames as arrays the UI formats (`at Class.method in file:line`):

```php
function toLogException(?\Throwable $e, int $depth = 0): ?array
{
    if ($e === null || $depth >= 10) {
        return null;
    }

    return [
        'type'        => get_class($e),
        'message'     => $e->getMessage(),
        'stack_trace' => array_merge(
            [['function' => '{throw}', 'file' => $e->getFile(), 'line' => $e->getLine()]],
            $e->getTrace(),
        ),
        'inner'       => toLogException($e->getPrevious(), $depth + 1),
    ];
}

try {
    $charges->charge($invoice);
} catch (\Throwable $e) {
    $logger->error('Charge failed for invoice {invoice_id}', [
        'invoice_id' => $invoice->id,
        'exception'  => toLogException($e),
    ]);
    throw $e;
}
```

`getTrace()` frames include `args` when `zend.exception_ignore_args` is off; drop them (`array_map(fn ($f) => array_diff_key($f, ['args' => 1]), …)`) so arguments such as passwords never reach the logs. This also follows the PSR-3 convention of passing the exception under the `exception` key.

**Node / TypeScript** — `err.stack` already starts with `Name: message`; `cause` is the inner exception:

```ts
function toLogException(err: unknown, depth = 0): unknown {
  if (err == null || depth >= 10) return undefined;
  if (!(err instanceof Error)) return String(err); // something that isn't an Error was thrown
  return {
    type: err.name,
    message: err.message,
    stack_trace: err.stack, // its "Name: message" first line is skipped by the UI
    inner: toLogException(err.cause, depth + 1),
  };
}
```

A stack trace is usually a few kilobytes; at thousands of errors a minute, consider a retention policy on `level=error` so they don't fill the database.

### Log level colours

| Level | Text | Background |
|-------|------|------------|
| `debug` | `gray-400` | `gray-800` |
| `info` | `sky-400` | `sky-900` |
| `notice` | `teal-400` | `teal-900` |
| `warning` | `amber-400` | `amber-900` |
| `error` | `rose-400` | `rose-900` |
| `critical` | `fuchsia-400` | `fuchsia-900` |

### Stats drawer

Click **Stats ▸** (floating button) to open a side drawer showing:

- Entry counts per level with proportional CSS bars
- Top 5 `app_key` values seen in the live stream
- Total live entries received this session

All stats are derived from the in-memory live buffer — they reset on page reload.

---

## Project structure

```
src/
├── types.ts                    LogEntry, SearchFilters, LogServiceConfig
├── store/
│   └── configStore.ts          localStorage read / write / clear helpers
├── context/
│   ├── AuthContext.tsx          Active config + openSettings() + signOut()
│   └── ThemeContext.tsx         Selected theme and mode, applied to <html>
├── themes/
│   ├── types.ts                 ThemeDefinition, defineTheme()
│   ├── engine.ts                Theme → CSS variables (light flips the scales)
│   ├── palette.ts               scale() for non-Tailwind palettes, contrast()
│   ├── registry.ts              Loads every file in presets/
│   ├── themeStore.ts            Theme preference in localStorage
│   └── presets/                 One file per theme
├── hooks/
│   ├── useWebSocket.ts          Auto-reconnecting WS hook with backoff
│   └── useLogs.ts               TanStack Query wrapper for GET /api/logs
├── components/
│   ├── SettingsScreen.tsx       First-visit and edit-mode settings form
│   ├── Header.tsx               Sticky top bar
│   ├── ThemePicker.tsx          Theme and light/dark/system menu
│   ├── FilterBar.tsx            Sticky search + filter controls
│   ├── LogTable.tsx             Virtualised log entry table
│   ├── LogRow.tsx               Single table row
│   ├── LogDetail.tsx            Expanded row detail panel
│   ├── LevelBadge.tsx           Colour-coded level pill
│   ├── StatsDrawer.tsx          Session stats slide-in panel
│   ├── ContextProperties.tsx    Context as a searchable property list
│   ├── ExceptionDetails.tsx     Exception and stack trace panel (context.exception)
│   ├── Skeleton.tsx             Loading placeholder rows
│   └── AuthErrorBanner.tsx      Persistent auth failure banner
├── App.tsx
└── main.tsx
```

---

## Building for production

```bash
npm run build
```

The output is in `dist/`. Serve it with any static host — Nginx, Caddy, Vercel, Netlify, GitHub Pages, or an S3 bucket.

Example Nginx config to serve the built app at the root alongside the API proxy:

```nginx
# Serve the built React app
location / {
    root   /var/www/logstream-ui/dist;
    index  index.html;
    try_files $uri $uri/ /index.html;
}

# Proxy the API and WebSocket (same domain, no CORS)
location /api/ {
    proxy_pass http://127.0.0.1:8081;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /ws {
    proxy_pass         http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
}
```

---

## Development

```bash
# Start the dev server with hot reload
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Build + preview the production bundle locally
npm run build && npm run preview
```

### Retaking the screenshots

`scripts/screenshots.py` drives the dev server with Playwright against a mocked logstream-server (HTTP routes and the WebSocket are faked in the browser, so no backend is needed) and writes every image into `docs/screenshots/`:

```bash
npx vite --port=5173 --host=127.0.0.1   # in another terminal
pip install playwright && playwright install chromium
python scripts/screenshots.py          # everything
python scripts/screenshots.py themes   # only the theme gallery
```

The argument picks a group: `existing` (events and phone shots), `selection` (events picked for copying), `screens` (all but the themes), `applications`, `retention`, `themes` or `all` (default). Run the images through a PNG optimiser (`pngquant`, `oxipng`) before committing.

### Pointing at a local backend

On first load, enter these values in the settings screen:

| Field | Value |
|-------|-------|
| API Base URL | `http://localhost:8081` |
| WebSocket URL | `ws://localhost:8080/ws` |
| UI Secret | the `UI_SECRET` from your local `.env` |

---

## Related

- [**logstream-server**](https://github.com/guibranco/logstream-server) — the PHP 8.3 + ReactPHP backend this UI connects to
- [**API documentation**](https://logs.straccini.com/docs) — live Swagger UI

---

## Licence

MIT