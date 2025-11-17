import { describe, it, expect } from "vitest";
import * as schema from "./schema";

describe("Database Schema", () => {
  it("should export repositories table", () => {
    expect(schema.repositories).toBeDefined();
  });

  it("should export deployments table", () => {
    expect(schema.deployments).toBeDefined();
  });

  it("should export incidents table", () => {
    expect(schema.incidents).toBeDefined();
  });

  it("should export failedChanges table", () => {
    expect(schema.failedChanges).toBeDefined();
  });
});
