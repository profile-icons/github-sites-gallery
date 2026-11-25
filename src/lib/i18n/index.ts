import { derived, type Readable, type Writable, writable } from 'svelte/store'
import eng from './locales/en.json'

export type Locale = string
export type MsgKey = keyof typeof eng
export type Msgs = Record<MsgKey, string>
export type TranslationParams = Readonly<Record<string, string | number>>
export type Translator = (key: MsgKey, params?: TranslationParams) => string
type LocaleLoader = () => Promise<Msgs>

const modules: Record<string, LocaleLoader> = import.meta.glob<Msgs>(
  ['./locales/*.json', '!./locales/en.json'],
  {
    import: 'default',
  },
)
const loaders: Map<Locale, LocaleLoader> = new Map(
  Object.entries(modules).map(([path, load]: [string, LocaleLoader]): [Locale, LocaleLoader] => [
    path.slice(path.lastIndexOf('/') + 1, -5),
    load,
  ]),
)
export const supLocales: readonly Locale[] = ['en', ...loaders.keys()].sort()
const curLocale: Writable<Locale> = writable<Locale>('en')
export const locale: Readable<Locale> = { subscribe: curLocale.subscribe }
const dicts: Map<Locale, Msgs> = new Map<Locale, Msgs>([['en', eng]])
const pending: Map<Locale, Promise<Msgs>> = new Map<Locale, Promise<Msgs>>()
const rtl: ReadonlySet<Locale> = new Set(['ar', 'fa', 'he', 'ps', 'sd', 'ur', 'yi'])
let reqNum: number = 0

export function isLocaleRTL(code: Locale): boolean {
  return rtl.has(code.toLowerCase().split('-', 1)[0] ?? code)
}

export function translate(
  key: MsgKey,
  code: Locale = 'en',
  params: TranslationParams = {},
): string {
  const template: string = dicts.get(code)?.[key] ?? eng[key]
  return template.replace(/\{([A-Za-z0-9_]+)\}/gu, (match: string, name: string): string =>
    params[name] === undefined ? match : String(params[name]),
  )
}

export const t: Readable<Translator> = derived(
  locale,
  (code: Locale): Translator =>
    (key: MsgKey, params: TranslationParams = {}): string =>
      translate(key, code, params),
)

export async function setLocale(code: Locale): Promise<boolean> {
  const id: number = ++reqNum
  const nxt: Locale = code === 'en' || loaders.has(code) ? code : 'en'
  if (!dicts.has(nxt)) {
    const load: LocaleLoader | undefined = loaders.get(nxt)
    if (load) {
      let loading: Promise<Msgs> | undefined = pending.get(nxt)
      if (!loading) {
        loading = load()
        pending.set(nxt, loading)
      }
      try {
        dicts.set(nxt, await loading)
      } finally {
        pending.delete(nxt)
      }
    }
  }
  if (id !== reqNum) return false
  curLocale.set(nxt)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = nxt === 'ns' ? 'nso' : nxt
    document.documentElement.dir = isLocaleRTL(nxt) ? 'rtl' : 'ltr'
    document.documentElement.dataset.locale = nxt
  }
  return true
}

const browserAliases: Readonly<Record<string, Locale>> = {
  fil: 'tl',
  in: 'id',
  iw: 'he',
  ji: 'yi',
  nb: 'no',
  nn: 'no',
  nso: 'ns',
}

export function matchBrowserLocale(languages: readonly string[]): Locale | undefined {
  for (const language of languages) {
    const normalized: string = language.trim().toLowerCase().replaceAll('_', '-')
    const base: string = normalized.split('-', 1)[0] ?? normalized
    for (const code of [normalized, base]) {
      const candidate: Locale = browserAliases[code] ?? code
      if (supLocales.includes(candidate)) return candidate
    }
  }
  return undefined
}

export function initBrowserLocale(): () => void {
  function browserLocale(): Locale | undefined {
    return matchBrowserLocale([...navigator.languages, navigator.language])
  }

  function handleLanguageChange(): void {
    const code: Locale | undefined = browserLocale()
    if (code) void setLocale(code).catch((): undefined => undefined)
  }

  window.addEventListener('languagechange', handleLanguageChange)
  void setLocale(browserLocale() ?? 'en').catch((): undefined => undefined)
  return (): void => window.removeEventListener('languagechange', handleLanguageChange)
}

export { localeDisplayName } from './names.ts'
