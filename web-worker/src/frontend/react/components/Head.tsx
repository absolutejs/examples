type HeadProps = {
  title?: string;
  description?: string;
  cssPath?: string;
};

export const Head = ({
  title = "AbsoluteJS Workers - React",
  description = "Web workers and service workers with React, powered by AbsoluteJS.",
  cssPath,
}: HeadProps) => (
  <head suppressHydrationWarning>
    <meta charSet="utf-8" />
    <title>{title}</title>
    <meta content={description} name="description" />
    <meta content="width=device-width, initial-scale=1" name="viewport" />
    <link href="/assets/ico/favicon.ico" rel="icon" />
    {cssPath && (
      <link
        href={cssPath}
        rel="stylesheet"
        suppressHydrationWarning
        type="text/css"
      />
    )}
  </head>
);
