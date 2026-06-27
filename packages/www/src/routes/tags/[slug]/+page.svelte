<script lang="ts">
  import { formatDate } from '$lib/content'

  let { data } = $props()
</script>

<h1>{data.tag.name}</h1>

<section>
  {#each data.data as post}
    <article>
      <a href={`/posts/${post.slug}`}>{post.title}</a>
      {#if post.excerpt}<p>{post.excerpt}</p>{/if}
      <time>{formatDate(post.published_at)}</time>
    </article>
  {:else}
    <p>No posts yet.</p>
  {/each}
</section>

<style>
  h1 {
    margin: 0 0 10px;
  }

  article {
    padding: 22px 0;
    border-bottom: 1px solid #dddddd;
  }

  a {
    font-size: 24px;
    font-weight: 700;
    text-decoration: none;
  }

  p {
    margin: 10px 0;
    line-height: 1.6;
  }

  time {
    color: #606368;
    font-size: 14px;
  }
</style>
