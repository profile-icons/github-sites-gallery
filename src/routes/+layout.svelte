<script lang="ts">
  import '../styles/main.scss'
  import { onMount, type Snippet } from 'svelte'
  import { initBrowserLocale } from '#lib/i18n/index.ts'

  let { children }: { children: Snippet } = $props()

  onMount(initBrowserLocale)
</script>

{@render children()}
