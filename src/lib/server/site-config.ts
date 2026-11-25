import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export async function readSiteConfig(): Promise<Record<string, unknown>> {
  const path = resolve(process.env.GALLERY_CONFIG_DIR || '.', 'site.config.json')
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return {}
    throw error
  }

  const config: unknown = JSON.parse(raw)
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new Error(`Expected a JSON object in ${path}.`)
  }
  return config as Record<string, unknown>
}
