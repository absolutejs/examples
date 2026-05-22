type ServerHtmlCardProps = {
  html: string;
};

export const ServerHtmlCard = (props: ServerHtmlCardProps) => (
  <article
    className="voice-card voice-provider-health-card"
    dangerouslySetInnerHTML={{ __html: props.html }}
  />
);
