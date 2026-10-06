import type { ThemeId } from "../themes";
import { PORTRAIT_CYBERPUNK, SCENE_CYBERPUNK } from "./themeArtCyberpunk";
import { PORTRAIT_VERDANT, SCENE_VERDANT } from "./themeArtVerdant";
import { PORTRAIT_STARRY, SCENE_STARRY } from "./themeArtStarry";
import { PORTRAIT_OCEAN, SCENE_OCEAN } from "./themeArtOcean";

export interface ThemeCatArt {
  /** Circular launcher portrait. */
  portrait: string;
  /** Modal scene background (cat + environment baked in). */
  scene: string;
}

/**
 * Custom cat art per theme. Cozy has no entry — it uses the original
 * 7-pose artwork (CAT_POSES) and room (CAT_BACKGROUND).
 */
export const THEME_CAT_ART: Partial<Record<ThemeId, ThemeCatArt>> = {
  cyberpunk: { portrait: PORTRAIT_CYBERPUNK, scene: SCENE_CYBERPUNK },
  verdant: { portrait: PORTRAIT_VERDANT, scene: SCENE_VERDANT },
  starry: { portrait: PORTRAIT_STARRY, scene: SCENE_STARRY },
  ocean: { portrait: PORTRAIT_OCEAN, scene: SCENE_OCEAN },
};
