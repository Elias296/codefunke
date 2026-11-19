import { describe, expect, it } from "vitest";
import { funkiSvg, type FunkiMood } from "./funki";

/** Das SVG wird auch als Bild (data:-URL) benutzt – dort ist jeder XML-Fehler fatal. */
describe("Funki-SVG", () => {
  for (const mood of ["happy", "cheer", "think", "oops", "wave"] as FunkiMood[]) {
    it(`ist gültiges XML ohne doppelte Attribute (${mood})`, () => {
      const svg = funkiSvg({ mood });
      for (const tag of svg.match(/<[a-z][^>]*>/g) ?? []) {
        const names = [...tag.matchAll(/\s([\w:-]+)=/g)].map((m) => m[1]);
        expect(new Set(names).size, tag).toBe(names.length);
      }
      expect(svg.match(/<g\b/g)?.length).toBe(svg.match(/<\/g>/g)?.length);
    });
  }
});
