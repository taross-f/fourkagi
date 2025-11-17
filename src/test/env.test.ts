import { describe, it, expect } from "vitest";

describe("Environment", () => {
  it("should have NODE_ENV set", () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  it("should be test environment", () => {
    expect(process.env.NODE_ENV).toBe("test");
  });
});
