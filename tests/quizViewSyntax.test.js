/**
 * Regression: a stray `'+G.pool[G.qi]+'` inside a template literal shipped
 * as a literal attribute value in quiz-view.js (the mark-verified button
 * beside imgDep questions). The button was rendered with
 *   data-idx="'+G.pool[G.qi]+'"
 * and the click handler then couldn't parse it, silently breaking the
 * "mark image-dependent question as verified" flow.
 *
 * Pin the fix: the mark-verified button MUST use ${...} template-literal
 * interpolation. The broad class of "template-literal-wrapped + concat" is
 * too common in legitimate ternary patterns inside interpolations to
 * fingerprint generically, so we guard the specific button here and leave
 * the broader pattern to code review.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const quizViewPath = resolve(import.meta.dirname, "..", "src", "ui", "quiz-view.js");

describe("mark-verified button — template-literal regression guard", () => {
  it("data-idx uses ${...} interpolation, not '+...+' string concat", () => {
    const src = readFileSync(quizViewPath, "utf-8");
    const match = src.match(/data-action="mark-verified"[^>]*data-idx=([^\s>]+)/);
    expect(match, "could not locate mark-verified button").toBeTruthy();
    const dataIdxValue = match[1];
    // Correct form: data-idx="${G.pool[G.qi]}"
    expect(dataIdxValue).toMatch(/\$\{/);
    // Broken form we shipped: data-idx="'+G.pool[G.qi]+'"
    expect(dataIdxValue).not.toMatch(/^"'\+/);
  });

  it("clear-eflag button data-idx also uses ${...} interpolation (sibling button in same line)", () => {
    const src = readFileSync(quizViewPath, "utf-8");
    const match = src.match(/data-action="clear-eflag"[^>]*data-idx=([^\s>]+)/);
    expect(match).toBeTruthy();
    expect(match[1]).toMatch(/\$\{/);
    expect(match[1]).not.toMatch(/^"'\+/);
  });

  it("remove-img button data-idx also uses ${...} interpolation", () => {
    const src = readFileSync(quizViewPath, "utf-8");
    const match = src.match(/data-action="remove-img"[^>]*data-idx=([^\s>]+)/);
    expect(match).toBeTruthy();
    expect(match[1]).toMatch(/\$\{/);
    expect(match[1]).not.toMatch(/^"'\+/);
  });
});
