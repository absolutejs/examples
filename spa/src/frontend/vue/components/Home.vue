<template>
  <div>
    <h2>Home</h2>
    <p>
      The default sub-route. Click the links in the sidebar — the URL updates,
      this content swaps, and the sidebar + click counter stay mounted.
    </p>
    <p>
      Refresh the page on any sub-route. The server-rendered initial HTML
      already shows the matching view because vue-router was navigated to the
      request URL <em>by AbsoluteJS</em> before SSR streamed — this page exports
      <code>routes</code> and nothing else.
    </p>
  </div>
</template>
