<script lang="ts">
  import { formatDate } from '$lib/content'

  let { data } = $props()
</script>

<article>
  <header>
    <h1>{data.data.title}</h1>
    <p><small>{formatDate(data.data.published_at)}</small></p>
  </header>
  <hr />
  {#if data.data.excerpt}<p class="excerpt">{data.data.excerpt}</p>{/if}
  <div class="content">
    {@html data.data.bodyHtml}
  </div>
</article>

<style>
  .excerpt {
    font-style: italic;
  }

  .content :global(img) {
    max-width: 100%;
    height: auto;
  }
</style>
