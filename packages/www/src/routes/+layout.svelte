<script lang="ts">
  let { children } = $props()
</script>

<svelte:head>
  <title>Worker Blog</title>
</svelte:head>

<header class="site-header">
  <a href="/" class="brand">Worker Blog</a>
</header>

<main>
  {@render children()}
</main>

<style>
  :global(body) {
    margin: 0;
    color: #202124;
    background: #fafafa;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  :global(a) {
    color: #0f5d5e;
  }

  .site-header {
    border-bottom: 1px solid #dddddd;
    background: #ffffff;
  }

  .brand {
    display: block;
    width: min(760px, calc(100% - 32px));
    margin: 0 auto;
    padding: 18px 0;
    color: inherit;
    font-size: 18px;
    font-weight: 700;
    text-decoration: none;
  }

  main {
    width: min(760px, calc(100% - 32px));
    margin: 0 auto;
    padding: 32px 0 56px;
  }
</style>
