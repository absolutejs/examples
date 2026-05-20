import { test, expect, type Page } from "@playwright/test";

// ── Valid sizes accepted by the /_absolute/image endpoint ────────────
const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const IMAGE_SIZES = [16, 32, 48, 64, 96, 128, 256, 384];
const ALL_SIZES = [...IMAGE_SIZES, ...DEVICE_SIZES].sort((a, b) => a - b);

// ── Framework definitions ────────────────────────────────────────────
const COMPONENT_FRAMEWORKS = [
  { name: "React", path: "/" },
  { name: "Svelte", path: "/svelte" },
  { name: "Vue", path: "/vue" },
  { name: "Angular", path: "/angular" },
] as const;

const STATIC_FRAMEWORKS = [
  { name: "HTML", path: "/html" },
  { name: "HTMX", path: "/htmx" },
] as const;

const ALL_FRAMEWORKS = [...COMPONENT_FRAMEWORKS, ...STATIC_FRAMEWORKS] as const;

// ── Expected image configurations per section ────────────────────────
const RESPONSIVE_IMAGES = [
  {
    alt: "Landscape photo",
    src: "/assets/jpg/landscape.jpg",
    width: 1200,
    height: 800,
    sizes: "(max-width: 640px) 100vw, 340px",
  },
  {
    alt: "Portrait photo",
    src: "/assets/jpg/portrait.jpg",
    width: 600,
    height: 900,
    sizes: "(max-width: 640px) 100vw, 340px",
  },
  {
    alt: "Square photo",
    src: "/assets/jpg/square.jpg",
    width: 800,
    height: 800,
    sizes: "(max-width: 640px) 100vw, 340px",
  },
] as const;

const FILL_IMAGE = {
  alt: "Fill mode landscape",
  src: "/assets/jpg/landscape.jpg",
} as const;

const UNOPTIMIZED_IMAGE = {
  alt: "Unoptimized square",
  src: "/assets/jpg/square.jpg",
  width: 800,
  height: 800,
} as const;

// ── Helpers ──────────────────────────────────────────────────────────

/** Parse srcset into an array of { url, descriptor } entries */
const parseSrcSet = (srcset: string) =>
  srcset
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(/\s+/);
      return { url: parts[0]!, descriptor: parts[1]! };
    });

/** Extract the w= query param from an optimization URL */
const extractWidth = (url: string) => {
  const match = url.match(/[?&]w=(\d+)/);
  return match ? Number(match[1]) : null;
};

/** Extract the q= query param from an optimization URL */
const extractQuality = (url: string) => {
  const match = url.match(/[?&]q=(\d+)/);
  return match ? Number(match[1]) : null;
};

/** Extract the url= query param (decoded) from an optimization URL */
const extractOriginalSrc = (url: string) => {
  const match = url.match(/[?&]url=([^&]+)/);
  return match ? decodeURIComponent(match[1]!) : null;
};

/** Assert no attribute has the literal string "undefined" or "null" */
const assertNoUndefinedAttributes = async (el: ReturnType<Page["locator"]>) => {
  const attrs = await el.evaluate((img) => {
    const result: Record<string, string> = {};
    for (const attr of img.attributes) {
      result[attr.name] = attr.value;
    }
    return result;
  });

  for (const [name, value] of Object.entries(attrs)) {
    expect(
      value,
      `Attribute "${name}" should not be the literal string "undefined"`,
    ).not.toBe("undefined");
    expect(
      value,
      `Attribute "${name}" should not be the literal string "null"`,
    ).not.toBe("null");
  }
};

// ── Tests ────────────────────────────────────────────────────────────

for (const framework of ALL_FRAMEWORKS) {
  test.describe(`${framework.name} (${framework.path})`, () => {
    test("page loads with 200 and no console errors or warnings", async ({
      page,
    }) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      page.on("pageerror", (err) => errors.push(err.message));
      page.on("console", (msg) => {
        const text = msg.text();

        // Ignore Angular/React dev-mode noise
        if (text.includes("development mode")) return;

        if (msg.type() === "error") {
          errors.push(text);
        }

        if (msg.type() === "warning") {
          // Catch hydration mismatches (Vue, Angular)
          if (text.includes("Hydration") || text.includes("mismatch")) {
            warnings.push(text);
          }
          // Catch Angular-specific warnings (NG0913 LCP, NG0904, NG0100, etc.)
          if (/NG\d{4}/.test(text)) {
            warnings.push(text);
          }
        }
      });

      const response = await page.goto(framework.path);
      expect(response?.status()).toBe(200);

      // Wait for hydration and image loading to complete
      await page.waitForLoadState("networkidle");

      expect(errors, `Console errors on ${framework.name} page`).toHaveLength(
        0,
      );
      expect(
        warnings,
        `Hydration/framework warnings on ${framework.name} page`,
      ).toHaveLength(0);
    });

    test.describe("responsive images", () => {
      for (const img of RESPONSIVE_IMAGES) {
        test(`${img.alt}: src points to optimization endpoint`, async ({
          page,
        }) => {
          await page.goto(framework.path);
          const el = page.locator(`img[alt="${img.alt}"]`);
          await expect(el).toHaveCount(1);

          const src = await el.getAttribute("src");
          expect(src, "src should use optimization endpoint").toContain(
            "/_absolute/image",
          );
          expect(src, "src should reference original path").toContain(
            encodeURIComponent(img.src),
          );

          const width = extractWidth(src!);
          expect(width, "src width should be present").not.toBeNull();
          expect(width, "src width should match declared width").toBe(
            img.width,
          );

          expect(extractQuality(src!), "quality should be 75").toBe(75);
        });

        test(`${img.alt}: srcset contains valid optimization URLs`, async ({
          page,
        }) => {
          await page.goto(framework.path);
          const el = page.locator(`img[alt="${img.alt}"]`);
          const srcset = await el.getAttribute("srcset");

          expect(srcset, "srcset should be present").toBeTruthy();
          expect(srcset, "srcset should not be 'undefined'").not.toBe(
            "undefined",
          );

          const entries = parseSrcSet(srcset!);
          expect(
            entries.length,
            "srcset should have multiple entries",
          ).toBeGreaterThan(1);

          for (const entry of entries) {
            expect(
              entry.url,
              `srcset entry should use optimization endpoint`,
            ).toContain("/_absolute/image");
            expect(
              extractOriginalSrc(entry.url),
              "srcset entry should reference original image",
            ).toBe(img.src);
            expect(
              extractQuality(entry.url),
              "srcset quality should be 75",
            ).toBe(75);

            const w = extractWidth(entry.url);
            expect(w, "srcset width should be present").not.toBeNull();
            expect(
              ALL_SIZES,
              `srcset width ${w} should be a valid size`,
            ).toContain(w);

            // Descriptor should match the width in the URL
            expect(
              entry.descriptor,
              "srcset descriptor should be a w or x descriptor",
            ).toMatch(/^\d+[wx]$/);
          }
        });

        test(`${img.alt}: sizes attribute is set`, async ({ page }) => {
          await page.goto(framework.path);
          const el = page.locator(`img[alt="${img.alt}"]`);
          const sizes = await el.getAttribute("sizes");
          expect(sizes, "sizes should be present").toBeTruthy();
          expect(sizes, "sizes should not be 'undefined'").not.toBe(
            "undefined",
          );
        });

        test(`${img.alt}: width and height are set for CLS prevention`, async ({
          page,
        }) => {
          await page.goto(framework.path);
          const el = page.locator(`img[alt="${img.alt}"]`);
          const width = await el.getAttribute("width");
          const height = await el.getAttribute("height");
          expect(width, "width attribute should be set").toBeTruthy();
          expect(height, "height attribute should be set").toBeTruthy();
          expect(Number(width)).toBe(img.width);
          expect(Number(height)).toBe(img.height);
        });

        test(`${img.alt}: no attributes contain literal "undefined"`, async ({
          page,
        }) => {
          await page.goto(framework.path);
          const el = page.locator(`img[alt="${img.alt}"]`);
          await assertNoUndefinedAttributes(el);
        });
      }
    });

    test.describe("fill mode image", () => {
      test("src uses optimization endpoint", async ({ page }) => {
        await page.goto(framework.path);
        const el = page.locator(`img[alt="${FILL_IMAGE.alt}"]`);
        await expect(el).toHaveCount(1);
        const src = await el.getAttribute("src");
        expect(src).toContain("/_absolute/image");
        expect(src).toContain(encodeURIComponent(FILL_IMAGE.src));
      });

      test("has srcset for responsive loading", async ({ page }) => {
        await page.goto(framework.path);
        const el = page.locator(`img[alt="${FILL_IMAGE.alt}"]`);
        const srcset = await el.getAttribute("srcset");
        expect(srcset, "fill image should have srcset").toBeTruthy();
        expect(srcset).not.toBe("undefined");

        const entries = parseSrcSet(srcset!);
        expect(entries.length).toBeGreaterThan(1);
        for (const entry of entries) {
          expect(entry.url).toContain("/_absolute/image");
        }
      });

      test("has sizes attribute", async ({ page }) => {
        await page.goto(framework.path);
        const el = page.locator(`img[alt="${FILL_IMAGE.alt}"]`);
        const sizes = await el.getAttribute("sizes");
        expect(sizes).toBeTruthy();
        expect(sizes).not.toBe("undefined");
      });

      test("does not have width/height attributes (parent controls size)", async ({
        page,
      }) => {
        await page.goto(framework.path);
        const el = page.locator(`img[alt="${FILL_IMAGE.alt}"]`);
        const width = await el.getAttribute("width");
        const height = await el.getAttribute("height");
        expect(width, "fill image should not have width").toBeFalsy();
        expect(height, "fill image should not have height").toBeFalsy();
      });

      test("uses object-fit: cover styling", async ({ page }) => {
        await page.goto(framework.path);
        const el = page.locator(`img[alt="${FILL_IMAGE.alt}"]`);
        const objectFit = await el.evaluate(
          (img) => getComputedStyle(img).objectFit,
        );
        expect(objectFit).toBe("cover");
      });

      test("no attributes contain literal 'undefined'", async ({ page }) => {
        await page.goto(framework.path);
        const el = page.locator(`img[alt="${FILL_IMAGE.alt}"]`);
        await assertNoUndefinedAttributes(el);
      });
    });

    test.describe("unoptimized image", () => {
      test("src is the original file path (no optimization endpoint)", async ({
        page,
      }) => {
        await page.goto(framework.path);
        const el = page.locator(`img[alt="${UNOPTIMIZED_IMAGE.alt}"]`);
        await expect(el).toHaveCount(1);
        const src = await el.getAttribute("src");
        expect(src).toBe(UNOPTIMIZED_IMAGE.src);
        expect(
          src,
          "unoptimized should not use optimization endpoint",
        ).not.toContain("/_absolute/image");
      });

      test("srcset is absent or empty (no responsive variants)", async ({
        page,
      }) => {
        await page.goto(framework.path);
        const el = page.locator(`img[alt="${UNOPTIMIZED_IMAGE.alt}"]`);
        const srcset = await el.getAttribute("srcset");
        // srcset should either not exist or be empty — never "undefined"
        if (srcset !== null) {
          expect(srcset).not.toBe("undefined");
          expect(srcset.trim()).toBe("");
        }
      });

      test("no attributes contain literal 'undefined'", async ({ page }) => {
        await page.goto(framework.path);
        const el = page.locator(`img[alt="${UNOPTIMIZED_IMAGE.alt}"]`);
        await assertNoUndefinedAttributes(el);
      });
    });
  });
}

// ── Priority image tests (component frameworks only) ─────────────────

// React, Svelte, Vue have a separate "Priority landscape" image
for (const framework of [
  { name: "React", path: "/" },
  { name: "Svelte", path: "/svelte" },
  { name: "Vue", path: "/vue" },
]) {
  test.describe(`${framework.name}: priority image`, () => {
    const PRIORITY_ALT = "Priority landscape";

    test("has loading=eager", async ({ page }) => {
      await page.goto(framework.path);
      const el = page.locator(`img[alt="${PRIORITY_ALT}"]`);
      await expect(el).toHaveCount(1);
      const loading = await el.getAttribute("loading");
      expect(loading).toBe("eager");
    });

    test("has fetchpriority=high", async ({ page }) => {
      await page.goto(framework.path);
      const el = page.locator(`img[alt="${PRIORITY_ALT}"]`);
      const fp = await el.getAttribute("fetchpriority");
      expect(fp).toBe("high");
    });

    test("src uses optimization endpoint", async ({ page }) => {
      await page.goto(framework.path);
      const el = page.locator(`img[alt="${PRIORITY_ALT}"]`);
      const src = await el.getAttribute("src");
      expect(src).toContain("/_absolute/image");
      expect(src).toContain(encodeURIComponent("/assets/jpg/landscape.jpg"));
    });

    test("has valid srcset", async ({ page }) => {
      await page.goto(framework.path);
      const el = page.locator(`img[alt="${PRIORITY_ALT}"]`);
      const srcset = await el.getAttribute("srcset");
      expect(srcset).toBeTruthy();
      expect(srcset).not.toBe("undefined");
      const entries = parseSrcSet(srcset!);
      expect(entries.length).toBeGreaterThan(1);
    });

    test("no attributes contain literal 'undefined'", async ({ page }) => {
      await page.goto(framework.path);
      const el = page.locator(`img[alt="${PRIORITY_ALT}"]`);
      await assertNoUndefinedAttributes(el);
    });
  });
}

// Angular has priority on the landscape and portrait responsive images
test.describe("Angular: priority on responsive images", () => {
  for (const alt of ["Landscape photo", "Portrait photo"]) {
    test(`${alt} has loading=eager`, async ({ page }) => {
      await page.goto("/angular");
      const el = page.locator(`img[alt="${alt}"]`);
      const loading = await el.getAttribute("loading");
      expect(loading).toBe("eager");
    });

    test(`${alt} has fetchpriority=high`, async ({ page }) => {
      await page.goto("/angular");
      const el = page.locator(`img[alt="${alt}"]`);
      const fp = await el.getAttribute("fetchpriority");
      expect(fp).toBe("high");
    });
  }

  test("Square photo (no priority) has loading=lazy", async ({ page }) => {
    await page.goto("/angular");
    const el = page.locator('img[alt="Square photo"]');
    const loading = await el.getAttribute("loading");
    expect(loading).toBe("lazy");
  });
});

// ── Image endpoint: actual image delivery ────────────────────────────

test.describe("image endpoint serves correct formats", () => {
  const IMAGE_URL =
    "/_absolute/image?url=%2Fassets%2Fjpg%2Flandscape.jpg&w=1200&q=75";

  test("returns webp when Accept includes image/webp", async ({ request }) => {
    const res = await request.get(IMAGE_URL, {
      headers: { Accept: "image/webp,image/png,*/*" },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/webp");

    const body = await res.body();
    expect(body.length, "image should have content").toBeGreaterThan(0);
  });

  test("returns avif when Accept includes image/avif", async ({ request }) => {
    const res = await request.get(IMAGE_URL, {
      headers: { Accept: "image/avif,image/webp,*/*" },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/avif");
  });

  test("returns jpeg when Accept has no modern formats", async ({
    request,
  }) => {
    const res = await request.get(IMAGE_URL, {
      headers: { Accept: "image/jpeg,*/*" },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/jpeg");
  });

  test("avif preferred over webp when both accepted (matches config order)", async ({
    request,
  }) => {
    const res = await request.get(IMAGE_URL, {
      headers: { Accept: "image/avif,image/webp,*/*" },
    });
    expect(res.headers()["content-type"]).toBe("image/avif");
  });

  test("rejects width not in allowed sizes", async ({ request }) => {
    const res = await request.get(
      "/_absolute/image?url=%2Fassets%2Fjpg%2Flandscape.jpg&w=999&q=75",
      { headers: { Accept: "image/webp,*/*" } },
    );
    expect(res.status()).toBe(400);
  });

  test("serves all valid device sizes", async ({ request }) => {
    for (const width of DEVICE_SIZES) {
      const res = await request.get(
        `/_absolute/image?url=%2Fassets%2Fjpg%2Flandscape.jpg&w=${width}&q=75`,
        { headers: { Accept: "image/webp,*/*" } },
      );
      expect(res.status(), `width ${width} should return 200`).toBe(200);
      expect(res.headers()["content-type"]).toBe("image/webp");
    }
  });

  test("serves all valid image sizes", async ({ request }) => {
    for (const width of IMAGE_SIZES) {
      const res = await request.get(
        `/_absolute/image?url=%2Fassets%2Fjpg%2Flandscape.jpg&w=${width}&q=75`,
        { headers: { Accept: "image/webp,*/*" } },
      );
      expect(res.status(), `width ${width} should return 200`).toBe(200);
    }
  });
});

// ── Verify actual image loading in the browser ───────────────────────

test.describe("images actually load in the browser", () => {
  for (const framework of ALL_FRAMEWORKS) {
    test(`${framework.name}: all optimized images return 200`, async ({
      page,
    }) => {
      const imageResponses: { url: string; status: number }[] = [];

      page.on("response", (response) => {
        const url = response.url();
        if (url.includes("/_absolute/image")) {
          imageResponses.push({ url, status: response.status() });
        }
      });

      await page.goto(framework.path);
      await page.waitForLoadState("networkidle");

      expect(
        imageResponses.length,
        "should have made requests to optimization endpoint",
      ).toBeGreaterThan(0);

      for (const { url, status } of imageResponses) {
        expect(status, `Image request ${url} should return 200`).toBe(200);
      }
    });

    test(`${framework.name}: no requests to /undefined`, async ({ page }) => {
      const requests: string[] = [];
      page.on("request", (req) => requests.push(req.url()));

      await page.goto(framework.path);
      await page.waitForLoadState("networkidle");

      const undefinedRequests = requests.filter((url) =>
        url.endsWith("/undefined"),
      );
      expect(
        undefinedRequests,
        "should not make any requests to /undefined",
      ).toHaveLength(0);
    });

    test(`${framework.name}: optimized images are served as webp or avif`, async ({
      page,
    }) => {
      const imageContentTypes: { url: string; contentType: string }[] = [];

      page.on("response", async (response) => {
        const url = response.url();
        if (url.includes("/_absolute/image")) {
          const contentType = response.headers()["content-type"] ?? "";
          imageContentTypes.push({ url, contentType });
        }
      });

      await page.goto(framework.path);
      await page.waitForLoadState("networkidle");

      expect(imageContentTypes.length).toBeGreaterThan(0);

      for (const { url, contentType } of imageContentTypes) {
        expect(
          contentType,
          `${url} should be served as a modern format`,
        ).toMatch(/^image\/(webp|avif)/);
      }
    });
  }
});
