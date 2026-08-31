# <owner>/<repo>  <!-- one file per repo, e.g. acme-widgets.md -->

- Repo: https://github.com/<owner>/<repo>
- My account: <github-username>
- Goal: <why you contribute here / what done looks like>
- Local clone: <path>

## Check recipe

Incremental, driven by the watchlist's last-sync date — do NOT poll every item:

```bash
gh search prs    --involves <account> --updated ">=$SINCE" --json repository,number,title,updatedAt,state
gh search issues --involves <account> --updated ">=$SINCE" --json repository,number,title,updatedAt,state
```

Only for the hits, go deep with `gh pr view` / `gh issue view` (reviews, comments, CI). Items owned by others belong in the watchlist's "Watched items" — `--involves` won't surface them. Without `gh`, the public API works unauthenticated at 60 req/h: `GET /repos/{owner}/{repo}/pulls/{n}`, `.../pulls/{n}/reviews`, `.../issues/{n}/comments`.

When reading comments, distinguish bot comments (CI, automated reviewers) from human ones — only actionable suggestions require action. Distinguish "approved with a remark" from "changes requested".

## Priority notes for this domain

1. Changes requested, or a maintainer asked a question → same day.
2. Unanswered new comment → reply soon, even just to acknowledge.
3. CI red → fix immediately; don't let a failing check sit overnight.
4. Approved but unmerged 2–3 weeks → one polite nudge (rebase + short note), then wait; many repos merge in batches.
5. All quiet → review someone else's PR, pick up the next issue, or work elsewhere.

## Active items

### PR #<n>: <title>
- Link: https://github.com/<owner>/<repo>/pull/<n>
- Status: open | approved-awaiting-merge | changes-requested | merged | closed
- Submitted: YYYY-MM-DD | last_checked: YYYY-MM-DD
- Snapshot: N comments, M reviews
- Impact one-liner: <what it fixes and for how many users>
- Next step: <one action>
- History:
  - YYYY-MM-DD submitted

## Done

<!-- merged/closed items move here with link + impact one-liner: your evidence archive -->
