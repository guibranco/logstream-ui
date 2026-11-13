"""Screenshots of logstream-ui against a mocked logstream-server (HTTP + WebSocket).

Usage: python scripts/screenshots.py [OUTPUT_DIR] [all|existing|screens|applications|retention|themes]
OUTPUT_DIR defaults to docs/screenshots and must be inside the current directory.
Needs the dev server running (LOGSTREAM_UI_URL, default http://127.0.0.1:5173/logstream-ui/)
and Playwright for Python. Set CHROME_PATH to use an installed Chrome instead of Playwright's Chromium.
"""
import json, os, random, re, sys, time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

BASE = os.environ.get("LOGSTREAM_UI_URL", "http://127.0.0.1:5173/logstream-ui/")
API = "https://logs.example.com"
WS = "wss://logs.example.com/ws"
def output_dir(arg):
    """The output folder, which must be inside the current directory (normally the repo root)."""
    root = os.path.realpath(os.getcwd())
    path = os.path.realpath(os.path.join(root, arg))
    if os.path.commonpath([root, path]) != root:
        sys.exit(f"Output folder must be inside {root}")
    return path

OUT = output_dir(sys.argv[1] if len(sys.argv) > 1 else "docs/screenshots")
os.makedirs(os.path.join(OUT, "themes"), exist_ok=True)
ONLY = sys.argv[2] if len(sys.argv) > 2 else "all"
CONFIG = {"apiUrl": API, "wsUrl": WS, "uiSecret": "lsu_example"}

random.seed(7)
NOW = datetime.now(timezone.utc)

def iso(dt): return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"

TRACE_A = "3f2a9c1e-8b4d-4c2a-9e51-7d0b6a2f4c11"
TRACE_B = "a71c04d2-55e3-4f6b-8c1d-2b9e7f30a8d4"
BATCH = "batch-20261113-0001"

EXC = {
    "type": "System.InvalidOperationException",
    "message": "Gateway refused the charge",
    "stack_trace": "   at Billing.ChargeService.ChargeAsync(Invoice invoice) in /src/Billing/ChargeService.cs:line 42\n   at Billing.Jobs.ChargeJob.RunAsync() in /src/Billing/Jobs/ChargeJob.cs:line 18",
    "inner": {
        "type": "System.Net.Http.HttpRequestException",
        "message": "Response status code does not indicate success: 502 (Bad Gateway).",
        "stack_trace": "   at Billing.GatewayClient.PostAsync(String path) in /src/Billing/GatewayClient.cs:line 77\n   at Billing.ChargeService.ChargeAsync(Invoice invoice) in /src/Billing/ChargeService.cs:line 38",
    },
}

# (app_key, app_id, level, category, template, values, trace, extra context)
SEED = [
    ("billing-api", "vinhedo1", "error", "payments", "Charge failed for invoice {invoice_id}", {"invoice_id": "INV-2026-000123"}, TRACE_A, {"amount": 149.9, "currency": "EUR", "attempt": 3, "exception": EXC}),
    ("webhooks", "vinhedo2", "info", "github.pull_request", "Pull request {repo}#{number} merged, {files} files changed", {"repo": "guibranco/logstream-ui", "number": 384, "files": 5}, TRACE_B, {}),
    ("gstraccini-bot", "vinhedo1", "warning", "rate_limit", "GitHub API rate limit at {percent}% for installation {installation_id}", {"percent": 82, "installation_id": 41562190}, None, {"remaining": 900}),
    ("webhooks", "vinhedo2", "debug", "queue", "Message {message_id} dequeued from {queue} after {elapsed_ms} ms", {"message_id": "7f3c2a", "queue": "webhooks.github", "elapsed_ms": 14}, TRACE_B, {}),
    ("billing-api", "vinhedo1", "info", "http", "GET {path} returned {status} in {elapsed_ms} ms", {"path": "/api/v1/invoices?status=open", "status": 200, "elapsed_ms": 38}, TRACE_A, {}),
    ("projects-monitor", "vinhedo2", "critical", "database", "Connection pool exhausted: {in_use} of {max} connections in use for {seconds} s", {"in_use": 50, "max": 50, "seconds": 30}, None, {"host": "mariadb.internal"}),
    ("grimoire-api", "vinhedo3", "notice", "secrets", "Secret {name} rotated by {actor}", {"name": "LOGSTREAM_API_TOKEN", "actor": "github-actions"}, None, {}),
    ("billing-api", "vinhedo1", "info", "payments", "Invoice {invoice_id} paid with {provider}", {"invoice_id": "INV-2026-000119", "provider": "stripe"}, TRACE_A, {}),
    ("api-br-vagas", "vinhedo1", "info", "labeler", "Labelled issue {repo}#{number} with {labels}", {"repo": "frontendbr/vagas", "number": 8214, "labels": "remote, senior"}, None, {}),
    ("gstraccini-bot", "vinhedo1", "error", "commands", "Command {command} failed on {repo}#{number}", {"command": "@gstraccini bump version", "repo": "guibranco/pancake", "number": 512}, None, {"exception": "System.TimeoutException: The operation has timed out.\n   at GStraccini.Commands.BumpVersion.ExecuteAsync() in /src/Commands/BumpVersion.cs:line 64"}),
    ("webhooks", "vinhedo2", "info", "github.push", "Push to {repo}@{branch}: {commits} commits", {"repo": "guibranco/logstream-server", "branch": "main", "commits": 3}, TRACE_B, {}),
    ("projects-monitor", "vinhedo2", "warning", "healthcheck", "Health check for {service} took {elapsed_ms} ms", {"service": "progressbar", "elapsed_ms": 2412}, None, {}),
    ("billing-api", "vinhedo1", "debug", "cache", "Cache miss for {key}", {"key": "customer:1042:plan"}, TRACE_A, {}),
    ("grimoire-api", "vinhedo3", "info", "http", "POST {path} returned {status} in {elapsed_ms} ms", {"path": "/api/v1/vaults/infra/secrets", "status": 201, "elapsed_ms": 61}, None, {}),
    ("api-br-vagas", "vinhedo1", "debug", "sync", "Synced {count} repositories in {elapsed_ms} ms", {"count": 27, "elapsed_ms": 812}, None, {}),
    ("gstraccini-bot", "vinhedo1", "info", "installations", "Installation {installation_id} added {repos} repositories", {"installation_id": 41562190, "repos": 4}, None, {}),
]

def render(template, values):
    return re.sub(r"\{(\w+)\}", lambda m: str(values.get(m.group(1), m.group(0))), template)

def make_entry(i, seed, when):
    app, app_id, level, cat, tpl, vals, trace, extra = seed
    ctx = dict(vals); ctx.update(extra)
    if cat in ("payments",) and "invoice_id" in vals:
        ctx = {"invoice": {"id": vals["invoice_id"], **({"amount": extra["amount"], "currency": extra["currency"]} if "amount" in extra else {})}}
        ctx.update({k: v for k, v in extra.items() if k not in ("amount", "currency")})
    return {
        "id": f"01JD{i:022d}",
        "trace_id": trace or f"{random.getrandbits(128):032x}"[:8] + "-0000-4000-8000-" + f"{random.getrandbits(48):012x}",
        "batch_id": BATCH if trace == TRACE_A else None,
        "app_key": app, "app_id": app_id, "level": level, "category": cat,
        "message": render(tpl, vals), "message_template": tpl, "context": ctx,
        "user_agent": "LogStream-Client/1.4 (.NET 10)" if app in ("billing-api", "webhooks", "gstraccini-bot", "grimoire-api") else "pancake/2.3 (PHP 8.3)",
        "sender_ip": "203.0.113.%d" % (10 + i % 40),
        "timestamp": iso(when), "created_at": iso(when),
    }

ENTRIES = []
for i in range(60):
    ENTRIES.append(make_entry(i, SEED[i % len(SEED)], NOW - timedelta(seconds=25 + i * 47)))

def matches(e, q):
    def vals(k):
        return q.get(k, []) + q.get(k + "[]", [])
    for k in ("level", "app_key"):
        v = vals(k)
        if v and e[k] not in v: return False
    for k in ("trace_id", "batch_id", "app_id", "message_template"):
        if q.get(k) and e[k] != q[k][0]: return False
    if q.get("category") and q["category"][0].lower() not in e["category"].lower(): return False
    if q.get("search") and q["search"][0].lower() not in e["message"].lower(): return False
    return True

CLIENTS = [
    {"name": "Billing service", "app_key": "billing-api", "active": True, "created_at": "2026-06-02T09:14:00Z", "updated_at": "2026-11-10T08:00:00Z"},
    {"name": "GitHub webhooks ingress", "app_key": "webhooks", "active": True, "created_at": "2026-06-02T09:20:00Z", "updated_at": "2026-10-01T12:30:00Z"},
    {"name": "GStraccini-bot", "app_key": "gstraccini-bot", "active": True, "created_at": "2026-06-15T18:02:00Z", "updated_at": "2026-11-01T10:10:00Z"},
    {"name": "Projects Monitor", "app_key": "projects-monitor", "active": True, "created_at": "2026-07-01T11:45:00Z", "updated_at": "2026-07-01T11:45:00Z"},
    {"name": "Grimoire API", "app_key": "grimoire-api", "active": True, "created_at": "2026-07-22T16:05:00Z", "updated_at": "2026-09-30T07:40:00Z"},
    {"name": "API BR Vagas", "app_key": "api-br-vagas", "active": True, "created_at": "2026-08-06T13:12:00Z", "updated_at": "2026-08-06T13:12:00Z"},
    {"name": "Legacy cron jobs", "app_key": "legacy-cron", "active": False, "created_at": "2026-06-03T08:00:00Z", "updated_at": "2026-09-12T15:22:00Z"},
]

POLICIES = [
    {"name": "drop-debug", "older_than_days": 7, "level": "debug"},
    {"name": "info-30-days", "older_than_days": 30, "level": "info"},
    {"name": "webhooks-60-days", "older_than_days": 60, "app_key": "webhooks"},
    {"name": "default-180-days", "older_than_days": 180},
]

def volume(days):
    buckets, tot = [], {"count": 0, "bytes": 0, "due_count": 0, "due_bytes": 0}
    for age in range(days - 1, -1, -1):
        d = (NOW - timedelta(days=age)).date()
        weekday = d.weekday()
        base = 4200 + int(1800 * random.random()) - (1500 if weekday >= 5 else 0)
        count = max(300, base)
        b = count * 610
        due = int(count * (0.55 if age > 30 else 0.3 if age > 7 else 0))
        bk = {"date": d.isoformat(), "age_days": age, "count": count, "bytes": b, "due_count": due, "due_bytes": due * 610}
        buckets.append(bk)
        for k in tot: tot[k] += bk[k]
    total_all = tot["count"] + 81234
    pols = []
    for p, share in zip(POLICIES, (0.22, 0.41, 0.18, 1.0)):
        mc = int(total_all * share)
        pols.append({"name": p["name"], "older_than_days": p["older_than_days"], "active": True,
                     "matched_count": mc, "matched_bytes": mc * 610, "due_count": int(mc * 0.35), "due_bytes": int(mc * 0.35) * 610,
                     "matched_share": share})
    return {"generated_at": iso(NOW), "days": days, "size_basis": "payload", "buckets": buckets,
            "older": {"count": 81234, "bytes": 81234 * 610, "due_count": 40000, "due_bytes": 40000 * 610},
            "future": {"count": 0, "bytes": 0, "due_count": 0, "due_bytes": 0},
            "policies": pols, "totals": tot}

RUN = {"ran_at": iso(NOW), "total_pruned": 51873, "policies": [
    {"policy": "drop-debug", "pruned": 18210, "files_removed": 0, "files_rewritten": 0, "dry_run": True, "duration_ms": 184, "summary": "18,210 debug entries older than 7 days would be deleted"},
    {"policy": "info-30-days", "pruned": 27604, "files_removed": 0, "files_rewritten": 0, "dry_run": True, "duration_ms": 341, "summary": "27,604 info entries older than 30 days would be deleted"},
    {"policy": "webhooks-60-days", "pruned": 6059, "files_removed": 0, "files_rewritten": 0, "dry_run": True, "duration_ms": 97, "summary": "6,059 webhooks entries older than 60 days would be deleted"},
    {"policy": "default-180-days", "pruned": 0, "files_removed": 0, "files_rewritten": 0, "dry_run": True, "duration_ms": 52, "summary": "Nothing older than 180 days"},
]}

INFO = {"version": "1.9.0", "storage_type": "mariadb",
        "features": {"client_management": True, "retention": True, "websocket": True, "multi_value_filters": True}}

def handle(route):
    req = route.request
    u = urlparse(req.url)
    q = parse_qs(u.query)
    path, method = u.path, req.method
    def j(body, status=200):
        route.fulfill(status=status, content_type="application/json", body=json.dumps(body),
                      headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*"})
    if method == "OPTIONS": return j({})
    if path == "/api/info": return j(INFO)
    if path == "/api/health": return j({"status": "ok"})
    if path == "/api/logs":
        rows = [e for e in ENTRIES if matches(e, q)]
        lim, off = int(q.get("limit", ["50"])[0]), int(q.get("offset", ["0"])[0])
        filtered = any(k not in ("limit", "offset", "date_from", "date_to") for k in q)
        total = len(rows) if filtered else 1284
        return j({"total": total, "limit": lim, "offset": off, "entries": rows[off:off + lim]})
    if path == "/api/clients" and method == "GET": return j({"clients": CLIENTS})
    if path == "/api/clients" and method == "POST":
        b = json.loads(req.post_data or "{}")
        return j({**b, "active": True, "created_at": iso(NOW), "updated_at": iso(NOW), "api_token": "lss_" + "example" * 4}, 201)
    m = re.match(r"/api/clients/([^/]+)/rotate", path)
    if m:
        c = next(c for c in CLIENTS if c["app_key"] == m.group(1))
        return j({**c, "api_token": "lss_" + "rotated" * 4})
    if path == "/api/retention/policies": return j({"policies": POLICIES})
    if path == "/api/retention/volume": return j(volume(int(q.get("days", ["90"])[0])))
    if path == "/api/retention/run": return j(RUN)
    return j({"error": "not mocked"}, 404)

class WSHub:
    def __init__(self): self.servers = []
    def handler(self, ws):
        self.servers.append(ws)
        ws.on_message(lambda m: ws.send(json.dumps({"type": "pong"})) if "ping" in str(m) else None)
        ws.send(json.dumps({"type": "connected", "connections": 3}))
    def push(self, entry):
        for ws in self.servers:
            try: ws.send(json.dumps({"type": "log", "data": entry}))
            except Exception: pass

def new_page(browser, *, mobile=False, theme=("green", "dark"), configured=True, scale=2, view="events", filters=None):
    vp = {"width": 390, "height": 844} if mobile else {"width": 1440, "height": 900}
    ctx = browser.new_context(viewport=vp, device_scale_factor=scale, is_mobile=mobile, has_touch=mobile, color_scheme="dark")
    hub = WSHub()
    ctx.route(re.compile(r"^https://logs\.example\.com/.*"), handle)
    ctx.route_web_socket(re.compile(r"^wss://logs\.example\.com/.*"), hub.handler)
    init = {"logservice:theme": json.dumps({"themeId": theme[0], "mode": theme[1]}),
            "logservice:view": view,
            "logservice:filters": json.dumps(filters or {})}
    if configured: init["logservice:config"] = json.dumps(CONFIG)
    ctx.add_init_script("(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1'); localStorage.clear(); const s = %s; for (const k in s) localStorage.setItem(k, s[k]); })()" % json.dumps(init))
    page = ctx.new_page()
    page.goto(BASE)
    page.wait_for_load_state("networkidle")
    time.sleep(1.2)
    return ctx, page, hub

def snap(page, name):
    page.mouse.move(0, 0)
    time.sleep(0.6)
    page.screenshot(path=f"{OUT}/{name}.png")
    print("saved", name)

CHARGE_FAILED = "Charge failed for invoice"

def expand_first(page, text):
    page.get_by_text(text).first.click()
    time.sleep(0.8)

def shoot_existing(browser):
    ctx, page, _ = new_page(browser, filters={"level": ["error", "critical"]})
    snap(page, "desktop-events"); ctx.close()
    ctx, page, _ = new_page(browser)
    expand_first(page, CHARGE_FAILED); page.mouse.wheel(0, 0)
    snap(page, "desktop-expanded-event"); ctx.close()
    ctx, page, _ = new_page(browser, filters={"context": {"invoice.currency": "EUR"}, "message_template": CHARGE_FAILED + " {invoice_id}"})
    if not page.get_by_text("Context contains").count():
        page.get_by_text("Advanced filters").first.click(); time.sleep(0.4)
    snap(page, "desktop-advanced-filters"); ctx.close()
    ctx, page, _ = new_page(browser, mobile=True, scale=2)
    snap(page, "mobile-events")
    page.get_by_role("button", name=re.compile("^Filters")).first.click(); time.sleep(0.5)
    snap(page, "mobile-filters")
    page.get_by_role("button", name=re.compile("^Filters")).first.click(); time.sleep(0.4)
    expand_first(page, "Pull request guibranco"); snap(page, "mobile-expanded-event"); ctx.close()

def shoot_pickers(browser):
    # Settings (first visit)
    ctx, page, _ = new_page(browser, configured=False)
    page.get_by_placeholder("https://logs.yourdomain.com").fill("https://logs.example.com")
    time.sleep(0.3)
    page.get_by_text("Use wss://logs.example.com/ws").click(); time.sleep(0.2)
    page.get_by_placeholder("Paste your UI_SECRET here").fill(CONFIG["uiSecret"])
    snap(page, "desktop-settings"); ctx.close()

    ctx, page, hub = new_page(browser)
    # Exception panel
    expand_first(page, CHARGE_FAILED)
    page.get_by_text("Gateway refused the charge").first.scroll_into_view_if_needed()
    snap(page, "desktop-exception")
    page.get_by_text(CHARGE_FAILED).first.click(); time.sleep(0.5)
    # Theme picker
    page.get_by_role("button", name="Theme").first.click(); time.sleep(0.5)
    snap(page, "desktop-theme-picker")
    page.keyboard.press("Escape"); time.sleep(0.3)
    # Date range
    page.get_by_test_id("date-range-button").click(); time.sleep(0.5)
    snap(page, "desktop-date-range")
    page.keyboard.press("Escape"); page.mouse.click(1400, 880); time.sleep(0.3)
    # App picker
    page.get_by_test_id("app-key-button").click(); time.sleep(0.3)
    page.get_by_role("option", name=re.compile("billing-api")).first.click()
    page.get_by_role("option", name=re.compile("gstraccini-bot")).first.click(); time.sleep(0.4)
    snap(page, "desktop-app-picker")
    page.keyboard.press("Escape"); page.mouse.click(1400, 880); time.sleep(0.3)
    ctx.close()

    # Stats drawer
    ctx, page, hub = new_page(browser)
    for i in range(12):
        hub.push(make_entry(500 + i, SEED[(i * 5) % len(SEED)], datetime.now(timezone.utc))); time.sleep(0.05)
    time.sleep(0.8)
    page.get_by_role("button", name="Stats").click(); time.sleep(0.8)
    snap(page, "desktop-stats")
    page.keyboard.press("Escape"); ctx.close()

    # Paused with held events
    ctx, page, hub = new_page(browser)
    page.get_by_role("button", name=re.compile("^Live")).click(); time.sleep(0.3)
    for i in range(4):
        hub.push(make_entry(600 + i, SEED[(i * 3 + 1) % len(SEED)], datetime.now(timezone.utc))); time.sleep(0.1)
    time.sleep(0.8)
    snap(page, "desktop-paused"); ctx.close()

    # Trace
    ctx, page, _ = new_page(browser, filters={"trace_id": TRACE_A})
    snap(page, "desktop-trace"); ctx.close()


def shoot_applications(browser):
    # Applications
    ctx, page, _ = new_page(browser, view="applications")
    snap(page, "desktop-applications")
    page.get_by_role("button", name=re.compile("Register App")).click(); time.sleep(0.6)
    page.get_by_placeholder("e.g. Billing service").fill("Payslip archiver")
    page.get_by_placeholder("e.g. billing-api").fill("payslip-archiver"); time.sleep(0.3)
    snap(page, "desktop-register-app")
    page.get_by_role("button", name=re.compile("^(Register|Create|Save)", re.I)).last.click(); time.sleep(0.8)
    snap(page, "desktop-token-reveal"); ctx.close()

def shoot_retention(browser):
    # Retention
    ctx, page, _ = new_page(browser, view="retention")
    time.sleep(0.8)
    snap(page, "desktop-retention")
    page.get_by_role("button", name=re.compile("Simulate Deletion")).click(); time.sleep(0.8)
    page.get_by_text(re.compile("would be deleted")).first.scroll_into_view_if_needed(); time.sleep(0.4)
    snap(page, "desktop-retention-run")
    page.evaluate("() => document.querySelector('.overflow-y-auto')?.scrollTo(0,0)")
    page.get_by_role("button", name=re.compile("New Policy")).click(); time.sleep(0.6)
    page.get_by_placeholder("e.g. remove-old-debug").fill("drop-old-warnings"); time.sleep(0.3)
    snap(page, "desktop-policy-form"); ctx.close()

    # Mobile screens
    ctx, page, _ = new_page(browser, mobile=True, view="retention")
    time.sleep(0.8); snap(page, "mobile-retention"); ctx.close()
    ctx, page, _ = new_page(browser, mobile=True, view="applications")
    snap(page, "mobile-applications"); ctx.close()

def shoot_themes(browser):
    ids = ["blue", "green", "red", "orange", "pink", "violet", "indigo", "ocean", "graphite", "sepia", "lime", "catppuccin", "solarized", "nord", "dracula", "high-contrast"]
    for tid in ids:
        for mode in ("light", "dark"):
            ctx, page, _ = new_page(browser, theme=(tid, mode), scale=1)
            expand_first(page, CHARGE_FAILED)
            snap(page, f"themes/{tid}-{mode}"); ctx.close()

GROUPS = {
    "existing": [shoot_existing],
    "screens": [shoot_existing, shoot_pickers, shoot_applications, shoot_retention],
    "applications": [shoot_applications],
    "retention": [shoot_retention],
    "themes": [shoot_themes],
}
GROUPS["all"] = GROUPS["screens"] + GROUPS["themes"]

def run(p):
    if ONLY not in GROUPS:
        sys.exit(f"Unknown group {ONLY!r}; use one of: {', '.join(GROUPS)}")
    browser = p.chromium.launch(executable_path=os.environ.get("CHROME_PATH") or None)
    for shoot in GROUPS[ONLY]:
        shoot(browser)
    browser.close()

with sync_playwright() as p:
    run(p)
