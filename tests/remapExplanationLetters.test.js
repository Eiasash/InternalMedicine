/**
 * v10.4.9 regression: remapExplanationLetters must remap option-letter
 * references in explanations after option shuffle, including BARE LABEL
 * forms like "א' שגויה" / "ב' נכונה".
 *
 * Bug originally found in sibling Geriatrics repo (v10.64.22). Porting
 * the same fix here since IM uses the same function in src/core/utils.js.
 */
import { describe, it, expect } from "vitest";
import { remapExplanationLetters } from "../src/core/utils.js";

describe("remapExplanationLetters — v10.4.9 fix", () => {
  const identity = [0, 1, 2, 3];

  it("identity shuffle leaves text unchanged", () => {
    const text = "התשובה הנכונה היא ב'. א' שגויה. Answer C.";
    expect(remapExplanationLetters(text, identity)).toBe(text);
  });

  it("does not remap mid-word gershayim like \"מג'ורי\" (Major)", () => {
    const swap = [1, 0, 2, 3];
    const text = "מאופיין על ידי דיכאון מג'ורי (Major Depression)";
    expect(remapExplanationLetters(text, swap)).toBe(text);
  });

  it("does not remap foreign-sound-at-word-start \"ג'נטיקה\" (genetics)", () => {
    const swap = [1, 0, 2, 3];
    const text = "ג'נטיקה היא חשובה";
    expect(remapExplanationLetters(text, swap)).toBe(text);
  });

  it("remaps \"תשובה ב'\" form when option shuffled", () => {
    const shuf = [3, 2, 0, 1];
    const text = "האפשרות הנכונה היא תשובה ב'.";
    expect(remapExplanationLetters(text, shuf)).toContain("תשובה ד'");
  });

  it("remaps bare \"א' שגויה\" label form when option shuffled", () => {
    const shuf = [3, 2, 0, 1];
    const text = "- **א' שגויה** — דופלר\n- **ד' שגויה** — anticoag";
    const result = remapExplanationLetters(text, shuf);
    expect(result).toContain("ג' שגויה");
    expect(result).toContain("א' שגויה");
  });

  it("remaps Latin standalone letters", () => {
    const shuf = [2, 0, 1, 3];
    expect(remapExplanationLetters("The answer is A.", shuf)).toBe("The answer is B.");
    expect(remapExplanationLetters("Choice B is correct.", shuf)).toBe("Choice C is correct.");
  });

  it("does not double-remap a letter in alternated patterns", () => {
    const swap = [1, 0, 2, 3];
    expect(remapExplanationLetters("תשובה ב' היא הנכונה", swap)).toBe("תשובה א' היא הנכונה");
  });
});
