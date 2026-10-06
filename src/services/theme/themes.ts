export type ThemeId = "cozy" | "cyberpunk" | "verdant" | "starry" | "ocean";

export interface ThemeDef {
  id: ThemeId;
  /** English display name. */
  name: string;
  emoji: string;
  tagline: string;
  /** Gradient swatch shown in the picker. */
  swatch: string;
  /**
   * CSS filter applied to the cat scene (cat sprite + room) so the
   * companion matches the theme. Cozy keeps the original artwork.
   */
  catFilter: string;
}

export const DEFAULT_THEME: ThemeId = "cozy";

export const THEMES: ThemeDef[] = [
  {
    id: "cozy",
    name: "Cozy Home",
    emoji: "🏠",
    tagline: "Warm and homey",
    swatch: "linear-gradient(135deg, #ffb347, #ff7b54)",
    catFilter: "none",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    emoji: "🌃",
    tagline: "Neon nights",
    swatch: "linear-gradient(135deg, #ff2fb3, #00e5ff)",
    catFilter: "hue-rotate(-70deg) saturate(1.7)",
  },
  {
    id: "verdant",
    name: "Verdant",
    emoji: "🌿",
    tagline: "Lush and green",
    swatch: "linear-gradient(135deg, #7bc96f, #2f9e5f)",
    catFilter: "hue-rotate(100deg) saturate(1.1)",
  },
  {
    id: "starry",
    name: "Starry Night",
    emoji: "✨",
    tagline: "Calm under stars",
    swatch: "linear-gradient(135deg, #3a4a8f, #7c9bff)",
    catFilter: "hue-rotate(180deg) saturate(0.9)",
  },
  {
    id: "ocean",
    name: "Deep Ocean",
    emoji: "🌊",
    tagline: "Quiet deep blue",
    swatch: "linear-gradient(135deg, #2fbfa8, #1e6f9e)",
    catFilter: "hue-rotate(140deg) saturate(1.1)",
  },
];

export function themeDef(id: ThemeId): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEMES.some((t) => t.id === value);
}
