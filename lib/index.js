/**
 * dsh-project-portfolio — long-term, cross-project memory for coding agents.
 *
 * Registers the embedded `project-portfolio` skill (instructions + packaged
 * templates as its resource base) and two tools, `portfolio_status` and
 * `portfolio_log`, over a plain-markdown portfolio directory the user owns.
 * Touches only `ctx.skills` / `ctx.tools` on the host side; the only
 * filesystem it reads or writes is the configured portfolio directory.
 *
 * @module dsh-project-portfolio
 */
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import z from '@deepseek-ai/schemastery'
import { buildTools } from './tools.js'

export const name = 'project-portfolio'
/** Skills is optional: without dsh-skill mounted this degrades to a pure tool plugin. */
export const inject = { tools: { required: true }, skills: { required: false } }

export const Config = z.object({
  enabled: z.boolean().default(true),
  portfolioDir: z.string(),
})

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const SKILL_DESCRIPTION =
  "File-based long-term memory for the user's projects: one markdown file per project plus a watchlist, synced and prioritized on request."
const SKILL_WHEN_TO_USE =
  "Use when the user is thinking about their work across many projects or over time, rather than the single repo in front of them: status of everything they're juggling, what to focus on next, a weekly review, starting to track a long-lived effort (a job hunt, side projects, PRs across repositories), reporting progress on one, or logging where a session left off. Not for planning a single task, one-repo status, or one-off questions about the current codebase."

function resolvePortfolioDir(config) {
  const raw = config.portfolioDir
  if (raw === undefined || raw === '') return join(homedir(), 'project-portfolio')
  if (raw === '~') return homedir()
  if (raw.startsWith('~/')) return join(homedir(), raw.slice(2))
  return isAbsolute(raw) ? raw : resolve(raw)
}

export function apply(ctx, config) {
  if (!config.enabled) return
  const dir = resolvePortfolioDir(config)

  for (const tool of buildTools(() => dir)) ctx.tools.register(tool)

  let skillNote = 'skill not registered (dsh-skill not mounted)'
  if (ctx.skills) {
    const content = readFileSync(join(PACKAGE_ROOT, 'skill', 'project-portfolio.md'), 'utf8')
      .replaceAll('{{PORTFOLIO_DIR}}', dir)
    ctx.skills.register({
      name: 'project-portfolio',
      description: SKILL_DESCRIPTION,
      whenToUse: SKILL_WHEN_TO_USE,
      content,
      source: 'runtime',
      resourceBase: { kind: 'directory', path: PACKAGE_ROOT },
    })
    skillNote = 'skill registered'
  }

  const line = `[dsh-project-portfolio] mounted: dir=${dir}, tools portfolio_status/portfolio_log registered, ${skillNote}`
  if (ctx.logger?.info) ctx.logger.info(line)
  else console.log(line)
}
