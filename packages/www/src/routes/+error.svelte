<script lang="ts">
  import { page } from '$app/state'
</script>

<h1>{page.status === 404 ? 'Not found' : 'Something went wrong'}</h1>
<p>{page.error?.message ?? 'The page could not be loaded.'}</p>
<a href="/">Back home</a>
