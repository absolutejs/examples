<script lang="ts">
  const TOKEN =
    /("(?:\\.|[^"\\])*"(?:\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

  let { data }: { data: unknown } = $props();

  const classForToken = (token: string) => {
    if (token.startsWith('"')) {
      return token.trimEnd().endsWith(":") ? "json__key" : "json__string";
    }
    if (token === "true" || token === "false") {
      return "json__bool";
    }
    if (token === "null") {
      return "json__null";
    }

    return "json__number";
  };

  const buildParts = (value: unknown) => {
    const text = JSON.stringify(value, null, 2) ?? "null";

    return text.split(TOKEN).map((part, index) => ({
      className: index % 2 === 0 ? "json__punct" : classForToken(part),
      key: index,
      text: part,
    }));
  };

  const parts = $derived(buildParts(data));
</script>

<pre class="json">{#each parts as part (part.key)}<span class={part.className}
      >{part.text}</span
    >{/each}</pre>
