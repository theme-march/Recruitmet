import test from "node:test";
import assert from "node:assert/strict";
import { pageResult, parsePagination } from "../src/lib/pagination.ts";

test("pagination is bounded and calculates offset", () => {
  const value = parsePagination("http://localhost/api/files?page=3&pageSize=25&q=abc");
  assert.equal(value.skip, 50);
  assert.equal(value.take, 25);
  assert.equal(value.q, "abc");
});

test("page metadata reports total pages", () => {
  assert.equal(pageResult([1], 51, 1, 25).meta.totalPages, 3);
});
