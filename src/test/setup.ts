import { vi } from "vitest";

// Global test setup
vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));
