import { loadEnvFile } from 'node:process'
import { readSiteConfig } from '#lib/server/site-config.ts'

export type AuthMode = 'anonymous' | 'installation' | 'pat'

export interface AppConfig {
  readonly logins: readonly string[]
  readonly primaryLogin: string
  readonly token: string
  readonly authMode: AuthMode
  readonly srcRepoUrl: string | null
  readonly screenshotDelayMS: number
}

export async function loadConfig(): Promise<AppConfig> {
  loadDotEnv()

  const { usernames } = await readSiteConfig()
  const srcRepo: string | null = process.env.GITHUB_REPOSITORY ?? null
  const owner = process.env.GITHUB_REPOSITORY_OWNER?.trim() || srcRepo?.split('/')[0]?.trim()
  const configLogins = parseLogins(usernames === undefined ? process.env.GH_USERNAMES : usernames)
  const ghPat: string = process.env.GH_PAT?.trim() || ''
  const installToken: string = process.env.GITHUB_TOKEN?.trim() || ''
  const logins = configLogins.length || !owner ? configLogins : [owner]

  return {
    logins,
    primaryLogin: logins[0] || '',
    token: ghPat || installToken,
    authMode: ghPat ? 'pat' : installToken ? 'installation' : 'anonymous',
    srcRepoUrl: srcRepo
      ? `${(process.env.GITHUB_SERVER_URL || 'https://github.com').replace(/\/+$/, '')}/${srcRepo}`
      : null,
    screenshotDelayMS: posInt(process.env.SCREENSHOT_DELAY_MS, 20_000),
  }
}

function loadDotEnv(): void {
  try {
    loadEnvFile('.env')
  } catch (error: unknown) {
    if (!hasErrCode(error, 'ENOENT')) throw error
  }
}

function parseLogins(value: unknown): string[] {
  if (value == null) return []
  const names: unknown = typeof value === 'string' ? value.split(/[\n,]/) : value
  if (!Array.isArray(names)) {
    throw new Error('Expected "usernames" to be a list of names or a comma-separated string.')
  }

  const logins = new Map<string, string>()
  for (const name of names) {
    if (typeof name !== 'string') throw new Error('Each "usernames" entry must be a string.')
    const login = name.trim()
    const key = login.toLowerCase()
    if (login && !logins.has(key)) logins.set(key, login)
  }
  return [...logins.values()]
}

function posInt(val: string | undefined, fb: number): number {
  const parsed: number = Number(val)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fb
}

function hasErrCode(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === code
}
