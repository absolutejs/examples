type ScopeListProps = {
  scopes: string[];
};

export const ScopeList = ({ scopes }: ScopeListProps) => (
  <div className="scope-list">
    {scopes.map((scope) => (
      <span className="scope" key={scope}>
        {scope}
      </span>
    ))}
  </div>
);
