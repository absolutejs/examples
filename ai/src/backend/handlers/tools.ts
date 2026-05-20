import type { AIToolMap } from "@absolutejs/ai";
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
