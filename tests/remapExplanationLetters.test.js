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

  it("remaps a Latin letter ONLY when directly anchored to an option keyword (G5)", () => {
    const shuf = [2, 0, 1, 3];
    // "A" is NOT adjacent to an option keyword here ("is A") -> HELD unchanged.
    // The G5 anchor policy removed the unguarded bare-Latin remap that would
    // otherwise corrupt medical tokens (vitamin A, class A, 34°C, hepatitis B…).
    expect(remapExplanationLetters("The answer is A.", shuf)).toBe("The answer is A.");
    // "B" directly follows the keyword "Choice" -> anchored -> remapped to C.
    expect(remapExplanationLetters("Choice B is correct.", shuf)).toBe("Choice C is correct.");
  });

  it("remaps Hebrew letter directly followed by ASCII letter (v10.4.10)", () => {
    const shuf = [1, 2, 0, 3];
    expect(remapExplanationLetters("תשובה אcorrect", shuf)).toBe("תשובה גcorrect");
  });

  it("remaps Hebrew letter directly followed by whitespace (v10.4.10)", () => {
    const shuf = [1, 2, 0, 3];
    expect(remapExplanationLetters("תשובה א נכונה", shuf)).toBe("תשובה ג נכונה");
  });

  it("does not double-remap a letter in alternated patterns", () => {
    const swap = [1, 0, 2, 3];
    expect(remapExplanationLetters("תשובה ב' היא הנכונה", swap)).toBe("תשובה א' היא הנכונה");
  });
});

describe("remapExplanationLetters — G5 medical-token guard", () => {
  // reverse map [3,2,1,0]: A<->D, B<->C — every bare Latin letter moves, so the
  // OLD unguarded remap would have corrupted these. NEW must leave them intact.
  const rev = [3, 2, 1, 0];

  it("POSITIVE: still remaps Latin letters anchored to answer/option/choice", () => {
    expect(remapExplanationLetters("answer A is correct", [2, 0, 1, 3])).toBe("answer B is correct");
    expect(remapExplanationLetters("see option (C)", [2, 0, 1, 3])).toBe("see option (A)");
    // "Choices: D" — keyword "Choices" + ": " separator anchors the letter; rev
    // map sends D(idx3) -> A(disp0).
    expect(remapExplanationLetters("Choices: D", rev)).toBe("Choices: A");
  });

  it("POSITIVE: still remaps Hebrew keyword / geresh option labels", () => {
    expect(remapExplanationLetters("תשובה ב'", rev)).toBe("תשובה ג'");
    expect(remapExplanationLetters("אפשרות א נכונה", rev)).toBe("אפשרות ד נכונה");
    expect(remapExplanationLetters("- **א' שגויה**", rev)).toContain("ד' שגויה");
  });

  it("NEGATIVE: never touches Latin medical tokens (vitamin/hepatitis/class/type/grade/part)", () => {
    expect(remapExplanationLetters("מתן ויטמין D במינון גבוה", rev)).toBe("מתן ויטמין D במינון גבוה");
    expect(remapExplanationLetters("hepatitis B carrier", rev)).toBe("hepatitis B carrier");
    expect(remapExplanationLetters("Child-Pugh class A cirrhosis", rev)).toBe("Child-Pugh class A cirrhosis");
    expect(remapExplanationLetters("type B aortic dissection", rev)).toBe("type B aortic dissection");
    expect(remapExplanationLetters("grade C esophagitis", rev)).toBe("grade C esophagitis");
    expect(remapExplanationLetters("part A of Medicare", rev)).toBe("part A of Medicare");
  });

  it("NEGATIVE: never touches degrees Celsius or SARC-F bold single letters", () => {
    expect(remapExplanationLetters("חום 38.5°C", rev)).toBe("חום 38.5°C");
    expect(remapExplanationLetters("SARC-F score **C** = calf", rev)).toBe("SARC-F score **C** = calf");
    expect(remapExplanationLetters("vitamin B12 low", rev)).toBe("vitamin B12 low");
  });
});
