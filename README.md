# dsh-project-portfolio

> 🚨 **Unofficial community plugin.** Not affiliated with, endorsed, or reviewed by DeepSeek. "DSH" appears in the name only as the community-recommended abbreviation for the harness this plugs into.
> 🚨 **非官方社区插件**：与 DeepSeek 无关联，未经其审核或背书。名称中的「DSH」仅为社区建议使用的缩写。

Long-term, cross-project memory for coding agents: one plain markdown file per project plus a global watchlist, owned by the user, maintained by the agent on request. Migrated from my skill repo [mc856/project-portfolio](https://github.com/mc856/project-portfolio) onto DSH's plugin seams.

## Where this sits (read before installing)

**DSH already ships the general capability this builds on.** The official skill subsystem — `dsh-skill` (registry), `dsh-skill-filesystem` (local skill directories), `dsh-tool-skill` (model-facing loader) — means that if all you want is these instructions, you can drop the original skill file into a skills directory today and stop there. This plugin is the packaged step past that, and everything it does goes through documented seams:

- **Embedded skill** via `ctx.skills.register(...)` — the official mechanism for plugins to contribute an in-memory skill. One install brings the instructions *and* the four project templates (exposed as the skill's resource base directory), and they update with the package.
- **Two registered tools** via `ctx.tools` — `portfolio_status` and `portfolio_log`, which turn the ledger's bookkeeping discipline (dated history lines, `last_checked` refreshes, path-safe file addressing) into validated tool calls instead of hoped-for freeform edits.

**Neighbors — same neighborhood, different squares.** [dsh-memoir](https://github.com/Qinling-Melon-Farmers/dsh-memoir) is automatic cross-session *conversation* memory (BM25 recall over what was said). [dsh-projects](https://github.com/WenhongPan/dsh-projects) organizes sessions and folders *inside* the DSH UI. This plugin is neither: it is a **user-owned ledger of goals, next steps, follow-up windows and history** in markdown you can grep, edit, version, and take with you — nothing is recorded automatically; the agent maintains it deliberately, through tools, on your instruction. If your need is "remember what we talked about", use dsh-memoir; if it is "don't lose the thread of my job hunt / side projects / PRs across months", that is this square.

## What you get

| Piece | What it does |
|---|---|
| `project-portfolio` skill | The full workflow: template routing, evidence-first bootstrapping, watchlist-driven incremental sync, priority ranking, discipline rules. Appears in the skill catalog like any other skill. |
| `portfolio_status` tool | Read-only, one call: full `_watchlist.md` + a headline inventory of every project file (first heading, `Status`/`Goal`/`Next step`/`last_checked` lines, last-modified date). |
| `portfolio_log` tool | Appends one dated history line to a project file's History section (creates the section if missing); optionally refreshes `last_checked`. Slug-validated so it can only address files inside the portfolio directory. |
| `templates/` | The four project templates (generic, GitHub PRs/issues, job hunt, side projects) plus the watchlist template, shipped as the skill's resource base. |

## Install

From a profile, as a bundle (the package declares `dsh.bundle.patch`; requires the package to be published on npm — until then, use the patch overlay below with an absolute path to a checkout):

```
dsh plugin add dsh-project-portfolio
```

Or mount it for a single run with a patch overlay (note: `--patch` is a launcher flag — keep it before web-app flags like `--port`):

```yaml
# my.patch.yml
- insert:
    - id: project-portfolio
      name: 'dsh-project-portfolio'   # or an absolute path to lib/index.js for a checkout
      config:
        portfolioDir: '~/project-portfolio'
```

```
dsh web --patch ./my.patch.yml
```

### Configuration

| Field | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Mount switch. |
| `portfolioDir` | `~/project-portfolio` | Absolute path (or `~/`-prefixed) to the portfolio directory. Created content is plain markdown; the directory is yours. |

## Compatibility

Tested by loading into `dsh web` on **0.1.1-rc.2** and **0.1.2-alpha.2** (2026-08-31: boot, skill catalog listing, skill content load, tool registration — zero errors on both). The optional-service degradation (`skills` not mounted → pure tool plugin) is by design; the `tools` service is required.

DSH is a v0.1 developer preview whose documentation states that breaking changes will happen. **Any DSH release may break this plugin.** Profiles pin plugin versions, so upgrading the host does not silently upgrade this plugin — after a host upgrade, expect to retest before trusting it.

**Exit clause / 退场条款:** this plugin exists to cover one square the official skill subsystem leaves to the ecosystem — packaged, tool-backed distribution of one specific skill. If an official capability (or a clearly better-established community standard) covers this square, this repo yields: it will be archived with a pointer to the successor rather than competing with it.

## Data flow & secrets

Read this section before pointing the plugin at real data.

- The plugin makes **no network calls** and collects **no telemetry**. Everything happens on the local filesystem.
- On the host side it touches **only** `ctx.skills` and `ctx.tools`. It never reads or writes anything under `$DSH_HOME` or any other DSH-internal state.
- On disk it reads and writes **only** the configured portfolio directory. `portfolio_log` accepts a single-segment slug (`[A-Za-z0-9_][A-Za-z0-9._-]*`); path separators and dot-prefixed names (`..`) are rejected, so tool calls cannot be steered outside the directory.
- **Everything `portfolio_status` returns enters the model context** — which means it is sent to whichever model provider your DSH profile is configured to use. Treat the portfolio directory accordingly:
  - never keep API keys, tokens, passwords, or other credentials in portfolio files;
  - a portfolio attracts exactly the kind of content you may not want leaving your machine — salary numbers, recruiter contacts, offer terms, personal goals. Decide deliberately what belongs in these files, and redact anything you would not paste into a chat with your provider;
  - the reader caps how much it ingests (`_watchlist.md` at 32 KB, per-file headline scan at 64 KB), but **a size cap is not redaction** — it bounds volume, not sensitivity.

## Relation to the original skill repo

[mc856/project-portfolio](https://github.com/mc856/project-portfolio) remains the harness-agnostic source (Claude Code / Codex / Cursor installs). This repo is its DSH-native form: same workflow and templates, plus the two tools that only make sense where a tool registry exists. Workflow fixes land in the original first and are ported here.

## Deferred (known, deliberately not in v0.1)

- **Session-end auto-logging** via the session-query seam — "log where this session left off" without being asked. The seam exists; wiring it responsibly (what to log, what never to log) needs more thought than this version wanted to rush.
- Parsing watchlist triggers in code (the skill currently owns that reasoning).
- An evidence-report tool (compiling impact one-liners across completed records).

## License

[MIT](LICENSE)
