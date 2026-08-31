/**
 * Tool definitions for dsh-project-portfolio, factored out of apply() so the
 * execute logic can be exercised directly in tests without booting a host.
 */
import { join } from 'node:path'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { defineTool } from '@deepseek-ai/dsh-tools'

/** Single path segment only: no separators, no leading dot (blocks . and ..). */
const SLUG = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const WATCHLIST_CAP = 32 * 1024
const HEADLINE_SCAN_CAP = 64 * 1024
/** Status-ish lines surfaced per project file in the status digest. */
const HEADLINE_FIELDS = /^\s*(?:[-*]\s*)?(?:\*\*)?(Status|Goal|Next step|last_checked|Follow-up)(?:\*\*)?\s*[:：]/i

function today() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function readCapped(path, cap) {
  const text = readFileSync(path, 'utf8')
  if (text.length <= cap) return { text, truncated: false }
  return { text: text.slice(0, cap), truncated: true }
}

/** Headline digest of one project file: first heading + status-ish lines. */
function digestProjectFile(path) {
  const { text, truncated } = readCapped(path, HEADLINE_SCAN_CAP)
  const lines = text.split('\n')
  const picked = []
  for (const line of lines) {
    if (picked.length === 0 && /^#\s+/.test(line)) {
      picked.push(line.trim())
      continue
    }
    if (HEADLINE_FIELDS.test(line)) picked.push(line.trim())
    if (picked.length >= 8) break
  }
  return { picked, truncated }
}

/**
 * Build the two portfolio tools over a lazily-resolved portfolio directory.
 * @param {() => string} getDir - returns the absolute portfolio directory.
 * @returns registry-ready tool definitions.
 */
export function buildTools(getDir) {
  const statusTool = defineTool({
    name: 'portfolio_status',
    description:
      'Read the project-portfolio state in one call: the full _watchlist.md (sync date, triggers, watched items) plus a headline inventory of every project file (first heading, Status/Goal/Next step/last_checked lines, last-modified date). Read-only. Call this first for any status, sync, or "what should I do next" request.',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    isConcurrencySafe: () => true,
    async execute() {
      const dir = getDir()
      if (!existsSync(dir)) {
        return [
          `Portfolio directory ${dir} does not exist yet.`,
          'Nothing is tracked. To start, follow the project-portfolio skill: create the directory,',
          'create _watchlist.md from templates/_watchlist.md, and bootstrap the first project file from evidence.',
        ].join('\n')
      }
      const names = readdirSync(dir).filter((n) => n.endsWith('.md')).sort()
      const out = [`Portfolio directory: ${dir}`, '']
      const watchlist = names.includes('_watchlist.md')
      if (watchlist) {
        const { text, truncated } = readCapped(join(dir, '_watchlist.md'), WATCHLIST_CAP)
        out.push('## _watchlist.md' + (truncated ? ' (truncated at 32 KB)' : ''), '', text.trimEnd(), '')
      } else {
        out.push('## _watchlist.md', '', '(missing — create it from templates/_watchlist.md, then read every project file individually)', '')
      }
      const projects = names.filter((n) => n !== '_watchlist.md')
      out.push(`## Project files (${projects.length})`, '')
      for (const name of projects) {
        const path = join(dir, name)
        const stat = statSync(path)
        const mtime = stat.mtime.toISOString().slice(0, 10)
        const { picked, truncated } = digestProjectFile(path)
        out.push(`### ${name} — modified ${mtime}${truncated ? ' (headline scan capped at 64 KB)' : ''}`)
        out.push(...(picked.length > 0 ? picked.map((l) => `  ${l}`) : ['  (no heading or status lines found)']))
        out.push('')
      }
      if (projects.length === 0) out.push('(no project files yet)', '')
      out.push('Headlines above are a digest; read a project file in full before acting on it.')
      return out.join('\n')
    },
  })

  const logTool = defineTool({
    name: 'portfolio_log',
    description:
      "Append one dated history line to a portfolio project file's History section (creating the section if absent), optionally refreshing its last_checked field. Use this for every history append instead of editing the file by hand. The file must already exist.",
    parameters: {
      project: {
        type: 'string',
        required: true,
        description: "Project file slug without extension, e.g. 'job-hunt' — or '_watchlist' for the watchlist.",
      },
      entry: {
        type: 'string',
        required: true,
        description: 'One-line event to record; it is prefixed with the date.',
      },
      date: {
        type: 'string',
        description: 'ISO date YYYY-MM-DD; defaults to today (local time).',
      },
      update_last_checked: {
        type: 'boolean',
        description: 'Also set the last_checked field to the date. Only pass true after verifying fresh external state. Default false.',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const dir = getDir()
      if (!SLUG.test(args.project)) {
        throw new Error(`invalid project slug "${args.project}" — expected a single file name segment matching ${SLUG}`)
      }
      const date = args.date ?? today()
      if (!ISO_DATE.test(date)) throw new Error(`invalid date "${date}" — expected YYYY-MM-DD`)
      const entry = args.entry.replace(/\s+/g, ' ').trim()
      if (entry.length === 0) throw new Error('entry must not be empty')
      const path = join(dir, `${args.project}.md`)
      if (!existsSync(path)) {
        throw new Error(`${path} does not exist — create the project file first (see the project-portfolio skill), then log to it`)
      }
      const text = readFileSync(path, 'utf8')
      const line = `- ${date} ${entry}`
      const lines = text.split('\n')
      const headingAt = lines.findIndex((l) => /^#{1,6}\s+History\b/.test(l))
      let updated
      let placement
      if (headingAt >= 0) {
        let insertAt = headingAt + 1
        while (insertAt < lines.length && lines[insertAt].trim() === '') insertAt += 1
        lines.splice(insertAt, 0, line)
        updated = lines.join('\n')
        placement = 'inserted at the top of the History section'
      } else {
        updated = `${text.replace(/\n*$/, '\n')}\n## History\n\n${line}\n`
        placement = 'no History section found — appended one at the end of the file'
      }
      const notes = [`Logged to ${path}: "${line}" (${placement}).`]
      if (args.update_last_checked === true) {
        const field = /^(\s*(?:[-*]\s*)?(?:\*\*)?last_checked(?:\*\*)?\s*[:：]\s*).*$/im
        if (field.test(updated)) {
          updated = updated.replace(field, `$1${date}`)
          notes.push(`last_checked set to ${date}.`)
        } else {
          notes.push('last_checked field not found — not updated; add one to the project file if you want it tracked.')
        }
      }
      writeFileSync(path, updated, 'utf8')
      return notes.join(' ')
    },
  })

  return [statusTool, logTool]
}
