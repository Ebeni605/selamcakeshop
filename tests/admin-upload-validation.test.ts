import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const adminSource = readFileSync(resolve(__dirname, "../src/routes/admin.index.tsx"), "utf8");
const loginSource = readFileSync(resolve(__dirname, "../src/routes/admin.login.tsx"), "utf8");
const availabilitySource = readFileSync(resolve(__dirname, "../src/components/sweet-bloom/availability.ts"), "utf8");

describe("admin image upload validation", () => {
  it("limits admin uploads to safe storefront image types", () => {
    expect(adminSource).toContain('"image/jpeg"');
    expect(adminSource).toContain('"image/png"');
    expect(adminSource).toContain('"image/webp"');
    expect(adminSource).toContain('"image/gif"');
    expect(adminSource).toContain("ALLOWED_IMAGE_TYPES.join");
  });

  it("enforces a clear max upload size before storage upload", () => {
    expect(adminSource).toContain("MAX_IMAGE_UPLOAD_MB = 5");
    expect(adminSource).toContain("file.size > MAX_IMAGE_UPLOAD_BYTES");
    expect(adminSource).toContain("This image is too large");
  });

  it("shows inline upload errors for both item and category editors", () => {
    expect(adminSource.match(/ma-upload-error/g)?.length).toBeGreaterThanOrEqual(2);
    expect(adminSource).toContain("uploadFailureMessage");
  });
});

describe("manager login defaults", () => {
  it("uses the generated manager email and password on the login page", () => {
    expect(availabilitySource).toContain('ADMIN_EMAIL = "manager@selamcake.com"');
    expect(loginSource).toContain('MANAGER_PASSWORD = "SelamManager2026!"');
  });
});