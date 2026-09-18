import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkAdminPassword, isValidAdminToken } from "../auth";

describe("admin auth", () => {
  const original = process.env.ADMIN_PASSWORD;
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "test-password-123";
  });
  afterEach(() => {
    process.env.ADMIN_PASSWORD = original;
  });

  it("checkAdminPassword only accepts the configured password", () => {
    expect(checkAdminPassword("test-password-123")).toBe(true);
    expect(checkAdminPassword("wrong")).toBe(false);
  });

  it("isValidAdminToken accepts the password as the cookie token and rejects anything else", () => {
    expect(isValidAdminToken("test-password-123")).toBe(true);
    expect(isValidAdminToken("some-random-cookie-value")).toBe(false);
    expect(isValidAdminToken(undefined)).toBe(false);
  });

  it("fails closed when ADMIN_PASSWORD isn't set, rather than throwing", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(checkAdminPassword("anything")).toBe(false);
    expect(isValidAdminToken("anything")).toBe(false);
  });
});
