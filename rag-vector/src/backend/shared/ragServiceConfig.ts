const DEFAULT_RAG_SERVICE_PORT = 3001;

export const getRagServicePort = () => {
  const value = process.env.RAG_SERVICE_PORT ?? process.env.PORT;
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_RAG_SERVICE_PORT;
};

export const getRagServiceBaseUrl = () => {
  const workspaceConfigured = process.env.ABSOLUTE_SERVICE_RAG_URL?.trim();
  if (workspaceConfigured) {
    return workspaceConfigured.replace(/\/$/, "");
  }

  const configured = process.env.RAG_SERVICE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return `http://localhost:${getRagServicePort()}`;
};
