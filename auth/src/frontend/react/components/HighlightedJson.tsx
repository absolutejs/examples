const TOKEN =
  /("(?:\\.|[^"\\])*"(?:\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

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

export const HighlightedJson = ({ data }: { data: unknown }) => {
  const text = JSON.stringify(data, null, 2) ?? "null";
  const parts = text.split(TOKEN);

  return (
    <pre className="json">
      {parts.map((part, index) =>
        index % 2 === 0 ? (
          <span className="json__punct" key={index}>
            {part}
          </span>
        ) : (
          <span className={classForToken(part)} key={index}>
            {part}
          </span>
        ),
      )}
    </pre>
  );
};
