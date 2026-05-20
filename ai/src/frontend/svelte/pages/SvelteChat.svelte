<script lang="ts">
  import Head from "@absolutejs/absolute/svelte/components/Head.js";
  import Chat from "../components/Chat.svelte";

  type SvelteChatProps = {
    cssPath?: string;
  };

  let { cssPath }: SvelteChatProps = $props();
</script>

<Head
  title="AbsoluteJS AI Chat - Svelte"
  description="AI streaming demo with Svelte, powered by AbsoluteJS."
  {cssPath}
/>

<Chat />
