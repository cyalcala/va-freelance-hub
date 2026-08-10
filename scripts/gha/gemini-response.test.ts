import { expect, test } from "bun:test";
import { extractActionPlan } from "./gemini-response";

test("extracts a bounded action-plan array from a Gemini REST response", () => {
  expect(extractActionPlan({
    candidates: [{ content: { parts: [{ text: '["Build a portfolio", "Contact three employers"]' }] } }],
  })).toEqual(["Build a portfolio", "Contact three employers"]);
});

test("rejects malformed Gemini responses instead of writing invalid digest data", () => {
  expect(() => extractActionPlan({ candidates: [] })).toThrow("no text candidate");
  expect(() => extractActionPlan({
    candidates: [{ content: { parts: [{ text: '{"not":"an array"}' }] } }],
  })).toThrow("array of action strings");
});
