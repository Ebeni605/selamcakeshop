import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const adminFile = resolve(__dirname, "../src/routes/admin.index.tsx");
const source = readFileSync(adminFile, "utf8");

describe("admin overview — removed sections stay removed", () => {
  // Nav-label tokens must not reappear in the admin dashboard.
  const forbiddenNavLabels = [
    "Sales Tracking",
    "Bulk Import",
    /label:\s*["']Costs["']/,
    /label:\s*["']Premises["']/,
  ];

  for (const token of forbiddenNavLabels) {
    it(`does not render nav label ${token}`, () => {
      if (token instanceof RegExp) {
        expect(source).not.toMatch(token);
      } else {
        expect(source).not.toContain(token);
      }
    });
  }

  // Section IDs that previously rendered cost/premises/sales views.
  const forbiddenSectionIds = [
    `section === "costs"`,
    `section === "premises"`,
    `section === "sales"`,
  ];
  for (const id of forbiddenSectionIds) {
    it(`does not switch to ${id}`, () => {
      expect(source).not.toContain(id);
    });
  }

  // Server-function and component modules backing those sections must be gone.
  const forbiddenImports = [
    "@/components/sweet-bloom/AdminFinance",
    "@/lib/admin-finance.functions",
    "CostsSection",
    "PremisesSection",
    "SalesSection",
    "listCosts",
    "listPremises",
    "getSalesAnalytics",
    "Revenue (30d)",
    "Units Sold (30d)",
    "Total Costs (30d)",
    "Unpaid Premises",
    "Ingredients",
    "Packaging",
    "Miscellaneous",
  ];
  for (const symbol of forbiddenImports) {
    it(`does not reference ${symbol}`, () => {
      expect(source).not.toContain(symbol);
    });
  }

  it("admin bulk-import route file is deleted", () => {
    expect(existsSync(resolve(__dirname, "../src/routes/admin.import.tsx"))).toBe(false);
  });

  it("AdminFinance component module is deleted", () => {
    expect(existsSync(resolve(__dirname, "../src/components/sweet-bloom/AdminFinance.tsx"))).toBe(false);
  });

  it("admin-finance server-function module is deleted", () => {
    expect(existsSync(resolve(__dirname, "../src/lib/admin-finance.functions.ts"))).toBe(false);
  });
});