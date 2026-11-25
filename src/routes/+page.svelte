<script lang="ts">
  import { onMount } from 'svelte'
  import Gallery from '#lib/components/Gallery.svelte'
  import { metadata, sites } from '#lib/data/index.ts'
  import { t } from '#lib/i18n/index.ts'
  import type { PageProps } from './$types'

  let { data }: PageProps = $props()
  const titleName = $derived(data.name || metadata.profile.name || metadata.profile.login || 'GitHub')

  onMount(() => {
    if (!data.gaId) return
    const analytics = window as Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
    const dataLayer = (analytics.dataLayer ??= [])
    function gtag(..._args: unknown[]): void {
      dataLayer.push(arguments)
    }
    analytics.gtag = gtag
    gtag('js', new Date())
    gtag('config', data.gaId)
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(data.gaId)}`
    document.head.append(script)
  })
</script>

<svelte:head>
  <title>{$t('pageTitle', { name: titleName })}</title>
  <meta name="description" content={$t('metaDescription')} />
  <meta name="author" content="Adam Ross (https://github.com/r055a)" />
  <meta name="theme-color" content="#0c0e12" />
</svelte:head>

<Gallery {sites} {metadata} {titleName} siteLinks={data.siteLinks} />
