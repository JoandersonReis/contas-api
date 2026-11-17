import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedWebOrigins } from "../dist/origins.js";

test("desenvolvimento aceita os dois hosts locais na porta configurada", () => {
  for (const host of ["localhost", "127.0.0.1"]) {
    const origins = allowedWebOrigins(`http://${host}:5173`, "development");
    assert.ok(origins.includes("http://localhost:5173"));
    assert.ok(origins.includes("http://127.0.0.1:5173"));
    assert.ok(!origins.includes("http://localhost:5174"));
    assert.ok(!origins.includes("https://other.example"));
    assert.ok(!origins.includes("http://localhost.evil.example:5173"));
  }
});

test("produção e hosts externos aceitam apenas a origem configurada", () => {
  assert.deepEqual(allowedWebOrigins("http://localhost:5173", "production"), [
    "http://localhost:5173",
  ]);
  assert.deepEqual(allowedWebOrigins("https://contas.example", "development"), [
    "https://contas.example",
  ]);
});
