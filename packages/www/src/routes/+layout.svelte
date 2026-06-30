<script lang="ts">
  import { browser } from "$app/environment"

  let { children, data } = $props()

  const settings = $derived(data.settings)
  const currentPath = $derived(data.currentPath || "/")
  const siteUrl = $derived(settings.siteUrl.replace(/\/$/, ""))
  const canonicalUrl = $derived(siteUrl ? `${siteUrl}${currentPath}` : "")

  $effect(() => {
    if (browser) {
      document.documentElement.lang = settings.language || "en"
    }
  })
</script>

<svelte:head>
  <title>{settings.siteName}</title>
  <meta name="description" content={settings.siteDescription} />
  <meta property="og:site_name" content={settings.siteName} />
  <meta property="og:title" content={settings.siteName} />
  <meta property="og:description" content={settings.siteDescription} />
  {#if canonicalUrl}
    <link rel="canonical" href={canonicalUrl} />
    <meta property="og:url" content={canonicalUrl} />
  {/if}
  {#if settings.faviconUrl}
    <link rel="icon" href={settings.faviconUrl} />
  {/if}
</svelte:head>

{#if settings.maintenanceMode}
  <main>
    <h1>{settings.siteName}</h1>
    <p>{settings.siteDescription}</p>
    <hr />
    <p>Maintenance in progress.</p>
  </main>
{:else}
  <header class="site-header">
    <h1><a href="/">{settings.siteName}</a></h1>
    <p>{settings.siteDescription}</p>
    <hr />
  </header>

  <main>
    {@render children()}
  </main>

  <footer>
    <hr />
    <small>Best viewed with a standards-compliant browser.</small>
  </footer>
{/if}

<style>
  :global(body) {
    max-width: 760px;
    margin: 8px;
    font-family: "Times New Roman", Times, serif;
  }

  @media (min-width: 800px) {
    :global(body) {
      margin: 8px auto;
    }
  }

  .site-header h1 {
    margin-bottom: 0;
  }
</style>
