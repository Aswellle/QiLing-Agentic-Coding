// Minimal cron scheduler for QiLing.
// Stores scheduled jobs in memory; REPL polls getAndFireDueJobs() every 30s.
// Cron format: "M H DoM Mon DoW" (standard 5-field)
// Supported field syntax: star (any), n (exact), star/n (every n), n-m (range), n,m (list)

export interface CronJob {
  id: string
  cron: string
  prompt: string
  humanSchedule: string
  recurring: boolean
  createdAt: number
  nextFireAt: number
  firedCount: number
}

const jobs = new Map<string, CronJob>()

// ─── ID generation ────────────────────────────────────────────────────────────

function cronId(): string {
  return `cron-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

// ─── Cron parser ──────────────────────────────────────────────────────────────

function matchField(value: number, expr: string, min: number, max: number): boolean {
  if (expr === '*') return true

  for (const part of expr.split(',')) {
    if (part.includes('/')) {
      const [rangeStr, stepStr] = part.split('/')
      const step = parseInt(stepStr, 10)
      const start = rangeStr === '*' ? min : parseInt(rangeStr, 10)
      if (!isNaN(step) && value >= start && (value - start) % step === 0) return true
    } else if (part.includes('-')) {
      const [a, b] = part.split('-').map(Number)
      if (value >= a && value <= b) return true
    } else {
      if (value === parseInt(part, 10)) return true
    }
  }
  return false
}

function cronMatches(cron: string, date: Date): boolean {
  const [m, h, dom, mon, dow] = cron.split(' ')
  if (!m || !h || !dom || !mon || !dow) return false
  return (
    matchField(date.getMinutes(), m, 0, 59) &&
    matchField(date.getHours(), h, 0, 23) &&
    matchField(date.getDate(), dom, 1, 31) &&
    matchField(date.getMonth() + 1, mon, 1, 12) &&
    matchField(date.getDay(), dow, 0, 6)
  )
}

function nextFireTime(cron: string, fromMs = Date.now()): number {
  // Advance minute-by-minute up to 1 year
  const d = new Date(fromMs)
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + 1)  // start from next minute
  const limit = fromMs + 366 * 24 * 60 * 60 * 1000

  while (d.getTime() < limit) {
    if (cronMatches(cron, d)) return d.getTime()
    d.setMinutes(d.getMinutes() + 1)
  }
  return -1  // no match in 1 year
}

export function validateCron(cron: string): string | null {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return 'Cron must have exactly 5 fields: M H DoM Mon DoW'
  if (nextFireTime(cron) === -1) return 'Cron expression never fires in the next year'
  return null
}

// ─── Human-readable cron ──────────────────────────────────────────────────────

export function cronToHuman(cron: string): string {
  const [m, h, dom, mon, dow] = cron.split(' ')
  if (m === '*' && h === '*') return 'every minute'
  if (m?.startsWith('*/')) return `every ${m.slice(2)} minute(s)`
  if (h === '*') return `at minute ${m} of every hour`
  if (dom === '*' && mon === '*' && dow === '*') return `daily at ${h.padStart(2,'0')}:${m.padStart(2,'0')}`
  if (dom === '*' && mon === '*') {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const d = parseInt(dow, 10)
    return `weekly on ${isNaN(d) ? dow : (days[d] ?? dow)} at ${h.padStart(2,'0')}:${m.padStart(2,'0')}`
  }
  return cron
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

const MAX_JOBS = 50

export function addCronJob(
  cron: string,
  prompt: string,
  recurring = true
): { job?: CronJob; error?: string } {
  const err = validateCron(cron)
  if (err) return { error: err }
  if (jobs.size >= MAX_JOBS) return { error: `Max ${MAX_JOBS} scheduled jobs reached` }

  const id = cronId()
  const next = nextFireTime(cron)
  const job: CronJob = {
    id, cron, prompt,
    humanSchedule: cronToHuman(cron),
    recurring,
    createdAt: Date.now(),
    nextFireAt: next,
    firedCount: 0,
  }
  jobs.set(id, job)
  return { job }
}

export function removeCronJob(id: string): boolean {
  return jobs.delete(id)
}

export function listCronJobs(): CronJob[] {
  return Array.from(jobs.values())
}

export function getCronJob(id: string): CronJob | undefined {
  return jobs.get(id)
}

/**
 * Returns prompts of all due jobs, advances or removes them.
 * Call this from REPL's polling interval.
 */
export function getAndFireDueJobs(): { id: string; prompt: string }[] {
  const now = Date.now()
  const due: { id: string; prompt: string }[] = []

  for (const [id, job] of jobs) {
    if (job.nextFireAt > 0 && job.nextFireAt <= now) {
      due.push({ id, prompt: job.prompt })
      if (job.recurring) {
        job.nextFireAt = nextFireTime(job.cron)
        job.firedCount++
        if (job.nextFireAt === -1) jobs.delete(id)  // no more matches
      } else {
        jobs.delete(id)  // one-shot: remove after firing
      }
    }
  }
  return due
}

export function clearAllCronJobs(): void {
  jobs.clear()
}
