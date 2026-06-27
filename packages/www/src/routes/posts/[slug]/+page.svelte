<script lang="ts">
  import { formatDate } from '$lib/content'

  let { data } = $props()
</script>

<article>
  <h1>{data.data.title}</h1>
  <time>{formatDate(data.data.published_at)}</time>
  {#if data.data.excerpt}<p class="excerpt">{data.data.excerpt}</p>{/if}
  <div class="content">
    {@html data.data.bodyHtml}
  </div>
</article>

<style>
  h1 {
    margin: 0 0 12px;
    font-size: clamp(34px, 7vw, 52px);
    line-height: 1.08;
  }

  time {
    color: #606368;
    font-size: 14px;
  }

  .excerpt {
    margin: 24px 0;
    color: #46494d;
    font-size: 20px;
    line-height: 1.5;
  }

  .content {
    margin-top: 28px;
    line-height: 1.75;
  }

  .content :global(img) {
    max-width: 100%;
    height: auto;
  }
</style>
