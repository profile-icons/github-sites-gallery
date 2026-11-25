<script lang="ts">
  import { t } from '#lib/i18n/index.ts'
  import type { SiteLink } from '#lib/types.ts'

  export let links: readonly SiteLink[]

  const maxLinks = 12
</script>

{#if links.length}
  <nav class="site-links" style:--site-link-count={Math.min(links.length, maxLinks)} aria-label={$t('sitesTitle')}>
    {#each links.slice(0, maxLinks) as link (link.name)}
      <a
        class="header-icon-button"
        href={link.url}
        target={link.url.startsWith('mailto:') ? undefined : '_blank'}
        rel="noopener noreferrer"
        title={link.label}
        aria-label={$t('openSite', { name: link.label })}
      >
        <svg viewBox={link.viewBox} width="19" height="19" fill="currentColor" aria-hidden="true" focusable="false">
          {@html link.iconBody}
        </svg>
      </a>
    {/each}
  </nav>
{/if}
