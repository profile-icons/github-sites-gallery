# GitHub Sites Gallery

Deploy a site preview gallery for sites linked to or deployed from public/private user/organization repositories.

Filter by:

- languages
- topics

Sort by (most/least):

- stars
- forks
- traffic
- languages (used)
- contributor count
- activity
- created

# Instructions

Copy the workflow to `.github/workflows/deploy-sites-gallery.yml`:

```yml
name: deploy-sites-gallery

on:
  schedule:
    - cron: "0 2 * * *"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  gallery:
    runs-on: ubuntu-26.04

    environment:
      name: github-pages
      url: ${{ steps.gallery.outputs.page-url }}

    steps:
      - name: Deploy
        id: gallery
        uses: profile-icons/github-sites-gallery@main
        with:
          gh_pat: ${{ secrets.GH_PAT }} # optional: Personal Access Token (PAT)
```

## Configuration

```json
{
  "name": "",
  "usernames": [],
  "links": {},
  "gaId": "",
  "locales": [],
}
```

- `name`: Optional: display name for the site heading and browser tab title.
- `usernames`: **Required**: username(s) associated with user/org repos deploying/linking the previewed site(s).
- `links`: Optional: website and social media mapped URLs for site heading icon links.
- `gaId`: Optional: GA4 measurement ID (example: `G-XXXXXXXXXX`).
- `locales`: Optional: target language codes for dynamic repo description translations.
  <details><summary>Valid locale code values for translation are listed here (mapped to respective language-key for reference) </summary>

  ```json
  {
    "Afrikaans": "af",
    "Albanian": "sq",
    "Amharic": "am",
    "Arabic": "ar",
    "Armenian": "hy",
    "Asturian": "ast",
    "Azerbaijani": "az",
    "Bashkir": "ba",
    "Belarusian": "be",
    "Bengali": "bn",
    "Bosnian": "bs",
    "Breton": "br",
    "Bulgarian": "bg",
    "Burmese": "my",
    "Catalan": "ca",
    "Cebuano": "ceb",
    "Chinese": "zh",
    "Czech": "cs",
    "Danish": "da",
    "Dutch": "nl",
    "English": "en",
    "Estonian": "et",
    "Finnish": "fi",
    "French": "fr",
    "Fulah": "ff",
    "Galician": "gl",
    "Ganda": "lg",
    "Georgian": "ka",
    "German": "de",
    "Greek": "el",
    "Gujarati": "gu",
    "Haitian Creole": "ht",
    "Hausa": "ha",
    "Hebrew": "he",
    "Hindi": "hi",
    "Croatian": "hr",
    "Hungarian": "hu",
    "Icelandic": "is",
    "Igbo": "ig",
    "Iloko": "ilo",
    "Indonesian": "id",
    "Irish": "ga",
    "Italian": "it",
    "Japanese": "ja",
    "Javanese": "jv",
    "Kannada": "kn",
    "Kazakh": "kk",
    "Khmer": "km",
    "Korean": "ko",
    "Lao": "lo",
    "Latvian": "lv",
    "Lingala": "ln",
    "Lithuanian": "lt",
    "Luxembourgish": "lb",
    "Macedonian": "mk",
    "Malagasy": "mg",
    "Malay": "ms",
    "Malayalam": "ml",
    "Marathi": "mr",
    "Mongolian": "mn",
    "Nepali": "ne",
    "Northern Sotho": "ns",
    "Norwegian": "no",
    "Occitan": "oc",
    "Odia": "or",
    "Pashto": "ps",
    "Persian": "fa",
    "Polish": "pl",
    "Portuguese": "pt",
    "Punjabi": "pa",
    "Romanian": "ro",
    "Russian": "ru",
    "Scottish Gaelic": "gd",
    "Serbian": "sr",
    "Sindhi": "sd",
    "Sinhala": "si",
    "Slovak": "sk",
    "Slovenian": "sl",
    "Somali": "so",
    "Spanish": "es",
    "Sundanese": "su",
    "Swahili": "sw",
    "Swati": "ss",
    "Swedish": "sv",
    "Tagalog": "tl",
    "Tamil": "ta",
    "Thai": "th",
    "Tswana": "tn",
    "Turkish": "tr",
    "Ukrainian": "uk",
    "Urdu": "ur",
    "Uzbek": "uz",
    "Vietnamese": "vi",
    "Welsh": "cy",
    "Western Frisian": "fy",
    "Wolof": "wo",
    "Xhosa": "xh",
    "Yiddish": "yi",
    "Yoruba": "yo",
    "Zulu": "zu"
  }
  ```

  </details>

### Example

```json
{
  "name": "Adam",
  "usernames": ["r055a", "profile-icons", "uni-projects-demos"],
  "links": {
    "BuyMeaCoffee": "https://buymeacoffee.com/kawhe.kiwi",
    "GitHub": "https://r055a.github.io/r055a"
  },
  "gaId": "",
  "locales": ["sv", "de", "fr"]
}
```

# Install

```bash
npm install
npx playwright install --with-deps chromium
```

# Run

```bash
npm run dev:data
```

# Build

```bash
npm run build:data
npm run preview
```

# Contribute

Before making an Issue-linked Pull Request, verify it passes CI checks:

```bash
npm run verify:fix
```
