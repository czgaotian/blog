<script lang="ts">
  import { formatDate } from '$lib/content'

  let { data } = $props()
</script>

<h1>{data.tag.name}</h1>

<section>
  {#each data.data as post}
    <article>
      <h2><a href={`/posts/${post.slug}`}>{post.title}</a></h2>
      <p><small>{formatDate(post.published_at)}</small></p>
      {#if post.excerpt}<p>{post.excerpt}</p>{/if}
      <hr />
    </article>
  {:else}
    <p>No posts yet.</p>
  {/each}
</section>
