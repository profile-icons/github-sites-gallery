import bootstrap from '@iconify-json/bi/icons.json' with { type: 'json' }
import * as brands from 'simple-icons'
import { readSiteConfig } from '#lib/server/site-config.ts'
import type { SiteLink } from '#lib/types.ts'

const brandIcons = new Map(Object.values(brands).map((icon) => [icon.slug, icon]))
const bootstrapIcons = new Map(Object.entries(bootstrap.icons))

function readLinks(links: unknown): Record<string, unknown> {
  if (links === undefined) return {}
  if (typeof links !== 'object' || links === null || Array.isArray(links)) {
    throw new Error('Expected "links" in site.config.json to map site names to URLs.')
  }
  return links as Record<string, unknown>
}

export async function load(): Promise<{ siteLinks: SiteLink[]; name: string; gaId: string }> {
  const config = await readSiteConfig()
  const name = optionalString(config.name, 'name')
  const gaId = optionalString(config.gaId, 'gaId')
  if (gaId && !/^G-[A-Z0-9]+$/u.test(gaId)) {
    throw new Error('Expected "gaId" to be a GA4 measurement ID (G-...).')
  }
  const siteLinks: SiteLink[] = []
  for (const [name, value] of Object.entries(readLinks(config.links))) {
    const label = name.trim()
    const url = typeof value === 'string' ? URL.parse(value.trim()) : null
    if (!label || !url || !['https:', 'http:', 'mailto:'].includes(url.protocol)) continue

    const key = label.toLowerCase().replace(/[\s_]+/gu, '-')
    const brand = brandIcons.get(key.replaceAll('-', ''))
    const icon =
      bootstrapIcons.get(key) ??
      (url.protocol === 'mailto:' ? bootstrap.icons.envelope : bootstrap.icons.globe2)

    siteLinks.push({
      name,
      url: url.href,
      label: brand?.title ?? label,
      viewBox: brand ? '0 0 24 24' : '0 0 16 16',
      iconBody: brand ? `<path d="${brand.path}"/>` : icon.body,
    })
  }
  return { siteLinks, name, gaId }
}

function optionalString(value: unknown, key: string): string {
  if (value === undefined) return ''
  if (typeof value !== 'string') throw new Error(`Expected "${key}" to be a string.`)
  return value.trim()
}
