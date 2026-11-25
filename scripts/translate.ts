import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { engLocaleNames } from '#lib/i18n/names.ts'
import { readSiteConfig } from '#lib/server/site-config.ts'
import type { Site } from '#lib/types.ts'

const config = await readSiteConfig()
const raw = config.locales ?? []
if (!Array.isArray(raw)) throw new Error('Expected "locales" to be an array of locale codes.')
const locales = new Set<string>()
for (const value of raw) {
  if (typeof value !== 'string' || !Object.hasOwn(engLocaleNames, value.trim().toLowerCase())) {
    throw new Error(`Unsupported description locale: ${String(value)}`)
  }
  const code = value.trim().toLowerCase()
  if (code === 'mi') {
    if (!process.argv.includes('--enabled')) {
      console.warn('SMaLL-100 does not support Māori; using original descriptions.')
    }
  } else if (code !== 'en') locales.add(code)
}

if (process.argv.includes('--enabled')) process.exit(locales.size ? 0 : 1)

const output = path.resolve('src/lib/data/sites.json')
if (!existsSync(output)) {
  if (locales.size) throw new Error('Run the site data collection before translating descriptions.')
} else {
  const sites: Site[] = JSON.parse(await readFile(output, 'utf8'))
  const cleaned = sites.map(({ descriptionTranslations: _previous, ...site }) => site)
  if (locales.size && cleaned.some((site) => site.description.trim())) {
    const binary = process.env.GALLERY_TRANSLATOR_BIN
    const command = binary || 'cargo'
    const args = binary
      ? [...locales]
      : [
          'run',
          '--quiet',
          '--release',
          '--manifest-path',
          'scripts/translator/Cargo.toml',
          '--target-dir',
          '.cache/gallery-translator',
          '--',
          ...locales,
        ]
    const translated = spawnSync(command, args, {
      input: JSON.stringify(cleaned),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'inherit'],
      maxBuffer: 64 * 1024 * 1024,
      env:
        binary && process.platform === 'linux'
          ? {
              ...process.env,
              LD_LIBRARY_PATH: [path.dirname(binary), process.env.LD_LIBRARY_PATH]
                .filter(Boolean)
                .join(path.delimiter),
            }
          : process.env,
    })
    if (translated.error && 'code' in translated.error && translated.error.code === 'ENOENT') {
      throw new Error(
        binary
          ? `Prebuilt gallery translator not found: ${binary}`
          : 'Rust/Cargo is required for description translations. Install Rust from https://rustup.rs/.',
      )
    }
    if (translated.error) throw translated.error
    if (translated.status !== 0) throw new Error('Description translation failed.')
    await writeFile(output, `${JSON.stringify(JSON.parse(translated.stdout), null, 2)}\n`)
  } else {
    await writeFile(output, `${JSON.stringify(cleaned, null, 2)}\n`)
  }
}
