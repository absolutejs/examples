<template>
  <div>
    <h2>Settings</h2>
    <p>
      Each sub-route is just a route in the page's exported
      <code>routes</code> array. AbsoluteJS owns the <code>createRouter</code> /
      <code>createMemoryHistory</code> / <code>createWebHistory</code> /
      <code>app.use(router)</code> / <code>router.push(url)</code> /
      <code>await router.isReady()</code> dance — the page module just declares
      routes and ships real <code>.vue</code> components.
    </p>
  </div>
</template>
