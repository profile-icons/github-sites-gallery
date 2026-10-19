import { derived, writable } from 'svelte/store'
import eng from './locales/en.json'

export type Locale = string
export type MsgKey = keyof typeof eng
export type Msgs = Record<MsgKey, string>
export type TranslationParams = Readonly<Record<string, string | number>>

export const STORAGE_KEY = 'gallery-locale'
const modules = import.meta.glob<Msgs>(['./locales/*.json', '!./locales/en.json'], {
  import: 'default',
})
const loaders = new Map(
  Object.entries(modules).map(([path, load]) => [path.slice(path.lastIndexOf('/') + 1, -5), load]),
)
export const supLocales: readonly Locale[] = ['en', ...loaders.keys()].sort()
const curLocale = writable<Locale>('en')
export const locale = { subscribe: curLocale.subscribe }
const dicts = new Map<Locale, Msgs>([['en', eng]])
const pending = new Map<Locale, Promise<Msgs>>()
const rtl = new Set([
  'ar',
  'arc',
  'ckb',
  'dv',
  'fa',
  'hbo',
  'he',
  'ks',
  'ku',
  'pal',
  'phn',
  'ps',
  'sam',
  'sd',
  'syc',
  'ug',
  'ur',
  'yi',
])
let reqNum = 0

export function isLocaleRTL(code: Locale): boolean {
  return rtl.has(code.toLowerCase().split('-', 1)[0] ?? code)
}

export function translate(
  key: MsgKey,
  code: Locale = 'en',
  params: TranslationParams = {},
): string {
  const template = dicts.get(code)?.[key] ?? eng[key]
  return template.replace(/\{([A-Za-z0-9_]+)\}/gu, (match: string, name: string) =>
    params[name] === undefined ? match : String(params[name]),
  )
}

export const t = derived(
  locale,
  (code) =>
    (key: MsgKey, params: TranslationParams = {}) =>
      translate(key, code, params),
)

export async function setLocale(code: Locale): Promise<boolean> {
  const id = ++reqNum
  const nxt = code === 'en' || loaders.has(code) ? code : 'en'
  if (!dicts.has(nxt)) {
    const load = loaders.get(nxt)
    if (load) {
      let loading = pending.get(nxt)
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
    document.documentElement.lang = nxt
    document.documentElement.dir = isLocaleRTL(nxt) ? 'rtl' : 'ltr'
    document.documentElement.dataset.locale = nxt
  }
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, nxt)
  } catch {}
  return true
}

export function restoreLocale(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && supLocales.includes(saved)) void setLocale(saved).catch(() => undefined)
  } catch {}
}

export { localeDisplayName } from './names.ts'
