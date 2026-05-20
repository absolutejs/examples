type FrameworkId = "angular" | "html" | "htmx" | "react" | "svelte" | "vue";
type StyleId = "less" | "scss" | "stylus" | "tailwind";

type StyleMatrixNavProps = {
  activeFramework: FrameworkId;
  activeStyle: StyleId;
};

const frameworks: Array<{ id: FrameworkId; label: string }> = [
  { id: "react", label: "React" },
  { id: "svelte", label: "Svelte" },
  { id: "vue", label: "Vue" },
  { id: "angular", label: "Angular" },
  { id: "html", label: "HTML" },
  { id: "htmx", label: "HTMX" },
];

const styleRows: Array<{
  id: StyleId;
  label: string;
}> = [
  { id: "tailwind", label: "Tailwind" },
  { id: "scss", label: "SCSS" },
  { id: "less", label: "Less" },
  { id: "stylus", label: "Stylus" },
];

const getStylePath = (framework: FrameworkId, style: StyleId) =>
  `/${framework}/${style}`;

export const StyleMatrixNav = ({
  activeFramework,
  activeStyle,
}: StyleMatrixNavProps) => (
  <nav>
    {styleRows.map((style) => (
      <div className="demo-nav-row" key={style.id}>
        <span
          className={
            style.id === activeStyle
              ? "demo-nav-row-label active"
              : "demo-nav-row-label"
          }
        >
          {style.label}
        </span>
        {frameworks.map((framework) => (
          <a
            className={
              style.id === activeStyle && framework.id === activeFramework
                ? "active"
                : ""
            }
            href={getStylePath(framework.id, style.id)}
            key={`${style.id}-${framework.id}`}
          >
            {framework.label}
          </a>
        ))}
      </div>
    ))}
  </nav>
);
