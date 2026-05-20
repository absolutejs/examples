import { Database } from "bun:sqlite";

const db = new Database(":memory:");

db.run(`
  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    in_stock INTEGER NOT NULL DEFAULT 1,
    description TEXT
  )
`);

const insert = db.prepare(
  "INSERT INTO products (name, category, price, in_stock, description) VALUES ($name, $category, $price, $inStock, $description)",
);

type ProductSeed = {
  $category: string;
  $description: string;
  $inStock: number;
  $name: string;
  $price: number;
};

const SEED_DATA: ProductSeed[] = [
  {
    $category: "electronics",
    $description: "Cherry MX Brown switches, RGB backlight, aluminum frame",
    $inStock: 1,
    $name: "Mechanical Keyboard",
    $price: 89.99,
  },
  {
    $category: "electronics",
    $description: "7-in-1 hub with HDMI, USB-A, SD card reader",
    $inStock: 1,
    $name: "USB-C Hub",
    $price: 34.99,
  },
  {
    $category: "clothing",
    $description: "Merino wool, one size fits all, charcoal gray",
    $inStock: 1,
    $name: "Wool Beanie",
    $price: 24.99,
  },
  {
    $category: "clothing",
    $description: "Lightweight mesh, carbon plate, neon green",
    $inStock: 0,
    $name: "Running Shoes",
    $price: 129.99,
  },
  {
    $category: "kitchen",
    $description: "12-inch pre-seasoned, works on all stovetops",
    $inStock: 1,
    $name: "Cast Iron Skillet",
    $price: 44.99,
  },
  {
    $category: "kitchen",
    $description: "Burr grinder, 18 grind settings, stainless steel",
    $inStock: 1,
    $name: "Coffee Grinder",
    $price: 59.99,
  },
  {
    $category: "office",
    $description: "Anti-fatigue, beveled edges, 20x32 inches",
    $inStock: 1,
    $name: "Standing Desk Mat",
    $price: 39.99,
  },
  {
    $category: "electronics",
    $description: "Auto-focus, built-in mic, privacy shutter",
    $inStock: 1,
    $name: "Webcam 1080p",
    $price: 49.99,
  },
  {
    $category: "accessories",
    $description: "RFID blocking, bifold, genuine leather",
    $inStock: 1,
    $name: "Leather Wallet",
    $price: 54.99,
  },
  {
    $category: "home",
    $description: "Full spectrum LED, USB powered, clip mount",
    $inStock: 1,
    $name: "Plant Grow Light",
    $price: 27.99,
  },
];

for (const product of SEED_DATA) {
  insert.run(product);
}

export { db };
