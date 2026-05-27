import type { AIToolMap } from "@absolutejs/ai";
import { codeExecutionTool } from "@absolutejs/ai/tools";
import { db } from "./database";

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === "object" && val !== null && !Array.isArray(val);

const getString = (obj: Record<string, unknown>, key: string) => {
  const val = obj[key];

  return typeof val === "string" ? val : "";
};

const getNumber = (obj: Record<string, unknown>, key: string) => {
  const val = obj[key];

  return typeof val === "number" ? val : undefined;
};

const searchProducts = (input: unknown) => {
  if (!isRecord(input)) {
    return "Invalid input.";
  }

  const query = getString(input, "query");
  const category = getString(input, "category");
  const maxPrice = getNumber(input, "max_price");

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (query) {
    conditions.push("(name LIKE ? OR description LIKE ?)");
    values.push(`%${query}%`, `%${query}%`);
  }

  if (category) {
    conditions.push("category = ?");
    values.push(category);
  }

  if (maxPrice !== undefined) {
    conditions.push("price <= ?");
    values.push(maxPrice);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT name, category, price, in_stock, description FROM products ${where} ORDER BY price`,
    )
    .all(...values);

  if (rows.length === 0) {
    return "No products found matching your criteria.";
  }

  return JSON.stringify(rows, null, 2);
};

const getProductDetails = (input: unknown) => {
  if (!isRecord(input)) {
    return "Invalid input.";
  }

  const name = getString(input, "name");

  if (!name) {
    return "Please provide a product name.";
  }

  const row = db
    .prepare("SELECT * FROM products WHERE name LIKE ?")
    .get(`%${name}%`);

  if (!row) {
    return `No product found matching "${name}".`;
  }

  return JSON.stringify(row, null, 2);
};

/**
 * Sync host fns the sandboxed `run_code` tool exposes. The model can call
 * these from inside JS it writes — same signatures as the standalone
 * `search_products` / `get_product_details` tools, but reachable
 * compositionally.
 *
 * Sync only: codeExecutionTool's default FFI backend doesn't pump
 * async-settling host fns. If we exposed something async (say, a real
 * HTTP fetch), we'd pass `backend: 'worker'` to the tool. SQLite reads
 * are sync so this is a non-issue here.
 */
const searchProductsForSandbox = (input: unknown) => {
  // Reuse the tool handler. It returns a JSON string; the model can
  // JSON.parse it inside the sandbox.
  return searchProducts(input);
};

const getProductDetailsForSandbox = (input: unknown) => {
  return getProductDetails(input);
};

export const tools: AIToolMap = {
  get_product_details: {
    description:
      "Get detailed information about a specific product by name. Use this when the user asks about a particular item.",
    handler: getProductDetails,
    input: {
      properties: {
        name: {
          description: "Product name or partial name to look up",
          type: "string",
        },
      },
      required: ["name"],
      type: "object",
    },
  },
  /**
   * Sandboxed JS execution. The model uses this when it needs to
   * COMPOSE or TRANSFORM results — sorting, filtering past what the
   * typed tools support, computing aggregates ("which category has the
   * cheapest item?"), formatting tables, etc. Runs in an
   * `@absolutejs/isolated-jsc` sandbox: no network, no FS, no host
   * globals beyond what we explicitly `expose`. Hard 256 MB heap +
   * 2-second wall-clock cap per call.
   */
  run_code: codeExecutionTool({
    memoryLimit: 256,
    timeout: 2_000,
    expose: {
      search_products: searchProductsForSandbox,
      get_product_details: getProductDetailsForSandbox,
    },
    description: [
      "Execute JavaScript in a sandboxed environment. Use this when you",
      "need to COMPOSE or TRANSFORM data — sort, filter past what the",
      "typed tools support, compute aggregates, format tables, etc.",
      "",
      "Input: { code: string }. The script's last expression is returned.",
      "Built-in: log(...) captures stdout-like output into result.log.",
      "",
      "Available host functions inside the sandbox (call them DIRECTLY,",
      "without `await` — they're sync):",
      "  - search_products({ query?, category?, max_price? }) -> JSON string",
      "  - get_product_details({ name }) -> JSON string",
      "",
      "Example use:",
      "  const raw = search_products({ category: 'electronics' });",
      "  const items = JSON.parse(raw);",
      "  items.sort((a, b) => a.price - b.price).slice(0, 3)",
      "",
      "Output: JSON with `{ ok, result, log, error?, cpuMs, heapBytes }`.",
    ].join("\n"),
  }),
  search_products: {
    description:
      "Search the product catalog. Can filter by text query, category, and maximum price. Categories: electronics, clothing, kitchen, office, accessories, home.",
    handler: searchProducts,
    input: {
      properties: {
        category: { description: "Filter by category", type: "string" },
        max_price: {
          description: "Maximum price in dollars",
          type: "number",
        },
        query: {
          description:
            "Search text to match against product names and descriptions",
          type: "string",
        },
      },
      type: "object",
    },
  },
};
