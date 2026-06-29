<script lang="ts">
  let { children } = $props()
</script>

<svelte:head>
  <title>Worker Blog</title>
</svelte:head>

<header class="site-header">
  <h1><a href="/">Worker Blog</a></h1>
  <p>Personal publishing for the World Wide Web</p>
  <hr />
</header>

<main>
  {@render children()}
</main>

<footer>
  <hr />
  <small>Best viewed with a standards-compliant browser.</small>
</footer>

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
