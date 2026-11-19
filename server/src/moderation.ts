/**
 * Sehr einfacher Wortfilter für Benutzernamen und Projekttitel.
 * Für eine echte Plattform mit vielen Kindern sollte zusätzlich ein Mensch
 * moderieren (Meldungen landen in der Tabelle project_reports).
 */
const BLOCKED = [
  "arsch", "fick", "fotze", "hure", "nazi", "hitler", "schlampe", "wichser", "missgeburt", "spast", "nutte", "kanake",
  "fuck", "shit", "bitch", "cunt", "nigger", "nigga", "faggot", "whore", "porn", "porno", "sex", "penis", "vagina",
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/[^a-zäöüß]/g, "");
}

export function containsBlockedWord(text: string): boolean {
  const n = normalize(text);
  return BLOCKED.some((w) => n.includes(w));
}
