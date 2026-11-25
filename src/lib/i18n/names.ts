export const engLocaleNames: Readonly<Record<string, string>> = {
  af: 'Afrikaans',
  am: 'Amharic',
  ar: 'Arabic',
  ast: 'Asturian',
  az: 'Azerbaijani',
  ba: 'Bashkir',
  be: 'Belarusian',
  bg: 'Bulgarian',
  bn: 'Bengali',
  br: 'Breton',
  bs: 'Bosnian',
  ca: 'Catalan',
  ceb: 'Cebuano',
  cs: 'Czech',
  cy: 'Welsh',
  da: 'Danish',
  de: 'German',
  el: 'Greek',
  en: 'English',
  es: 'Spanish',
  et: 'Estonian',
  fa: 'Persian',
  ff: 'Fulah',
  fi: 'Finnish',
  fr: 'French',
  fy: 'Western Frisian',
  ga: 'Irish',
  gd: 'Scottish Gaelic',
  gl: 'Galician',
  gu: 'Gujarati',
  ha: 'Hausa',
  he: 'Hebrew',
  hi: 'Hindi',
  hr: 'Croatian',
  ht: 'Haitian Creole',
  hu: 'Hungarian',
  hy: 'Armenian',
  id: 'Indonesian',
  ig: 'Igbo',
  ilo: 'Iloko',
  is: 'Icelandic',
  it: 'Italian',
  ja: 'Japanese',
  jv: 'Javanese',
  ka: 'Georgian',
  kk: 'Kazakh',
  km: 'Khmer',
  kn: 'Kannada',
  ko: 'Korean',
  lb: 'Luxembourgish',
  lg: 'Ganda',
  ln: 'Lingala',
  lo: 'Lao',
  lt: 'Lithuanian',
  lv: 'Latvian',
  mg: 'Malagasy',
  mi: 'Maori',
  mk: 'Macedonian',
  ml: 'Malayalam',
  mn: 'Mongolian',
  mr: 'Marathi',
  ms: 'Malay',
  my: 'Burmese',
  ne: 'Nepali',
  nl: 'Dutch',
  no: 'Norwegian',
  ns: 'Northern Sotho',
  oc: 'Occitan',
  or: 'Odia',
  pa: 'Punjabi',
  pl: 'Polish',
  ps: 'Pashto',
  pt: 'Portuguese',
  ro: 'Romanian',
  ru: 'Russian',
  sd: 'Sindhi',
  si: 'Sinhala',
  sk: 'Slovak',
  sl: 'Slovenian',
  so: 'Somali',
  sq: 'Albanian',
  sr: 'Serbian',
  ss: 'Swati',
  su: 'Sundanese',
  sv: 'Swedish',
  sw: 'Swahili',
  ta: 'Tamil',
  th: 'Thai',
  tl: 'Tagalog',
  tn: 'Tswana',
  tr: 'Turkish',
  uk: 'Ukrainian',
  ur: 'Urdu',
  uz: 'Uzbek',
  vi: 'Vietnamese',
  wo: 'Wolof',
  xh: 'Xhosa',
  yi: 'Yiddish',
  yo: 'Yoruba',
  zh: 'Chinese',
  zu: 'Zulu',
}

const preciseNames: ReadonlySet<string> = new Set(['ns', 'tl'])
const displayNames: Map<string, Intl.DisplayNames> = new Map<string, Intl.DisplayNames>()

function displayNamesFor(displayLocale: string): Intl.DisplayNames {
  let formatter: Intl.DisplayNames | undefined = displayNames.get(displayLocale)
  if (formatter === undefined) {
    try {
      formatter = new Intl.DisplayNames([displayLocale], { type: 'language', fallback: 'none' })
    } catch {
      formatter = new Intl.DisplayNames(['en'], { type: 'language', fallback: 'none' })
    }
    displayNames.set(displayLocale, formatter)
  }
  return formatter
}

export function localeDisplayName(code: string, displayLocale: string): string {
  const fb: string = engLocaleNames[code] ?? code

  if (preciseNames.has(code)) {
    return fb
  }

  try {
    const name: string | undefined = displayNamesFor(
      displayLocale === 'ns' ? 'nso' : displayLocale,
    ).of(code)
    if (name !== undefined && name.toLowerCase() !== code.toLowerCase()) {
      return name
    }
  } catch {}

  return fb
}
