<script lang="ts">
  type ServerHtmlCardProps = {
    className?: string;
    html: string;
    onClick?: (event: MouseEvent) => void;
  };

  let {
    className = "voice-card voice-provider-health-card",
    html,
    onClick,
  }: ServerHtmlCardProps = $props();
</script>

<div class={className} on:click={onClick}>
  {@html html}
</div>
