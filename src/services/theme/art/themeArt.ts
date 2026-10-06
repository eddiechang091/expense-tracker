import type { ThemeId } from "../themes";
import type { CatPose } from "@/services/cat/catImages";
import { PORTRAIT_CYBERPUNK, SCENE_CYBERPUNK } from "./themeArtCyberpunk";
import { PORTRAIT_VERDANT, SCENE_VERDANT } from "./themeArtVerdant";
import { PORTRAIT_STARRY, SCENE_STARRY } from "./themeArtStarry";
import { PORTRAIT_OCEAN, SCENE_OCEAN } from "./themeArtOcean";
import { POSE_CYBERPUNK_EAT } from "./themeArtCyberpunkPoseEat";
import { POSE_CYBERPUNK_PLAY } from "./themeArtCyberpunkPosePlay";
import { POSE_CYBERPUNK_GROOM } from "./themeArtCyberpunkPoseGroom";
import { POSE_CYBERPUNK_SLEEP } from "./themeArtCyberpunkPoseSleep";
import { POSE_CYBERPUNK_TALK } from "./themeArtCyberpunkPoseTalk";
import { POSE_CYBERPUNK_POOP } from "./themeArtCyberpunkPosePoop";
import { POSE_VERDANT_EAT } from "./themeArtVerdantPoseEat";
import { POSE_VERDANT_PLAY } from "./themeArtVerdantPosePlay";
import { POSE_VERDANT_GROOM } from "./themeArtVerdantPoseGroom";
import { POSE_VERDANT_SLEEP } from "./themeArtVerdantPoseSleep";
import { POSE_VERDANT_TALK } from "./themeArtVerdantPoseTalk";
import { POSE_VERDANT_POOP } from "./themeArtVerdantPosePoop";
import { POSE_STARRY_EAT } from "./themeArtStarryPoseEat";
import { POSE_STARRY_PLAY } from "./themeArtStarryPosePlay";
import { POSE_STARRY_GROOM } from "./themeArtStarryPoseGroom";
import { POSE_STARRY_SLEEP } from "./themeArtStarryPoseSleep";
import { POSE_STARRY_TALK } from "./themeArtStarryPoseTalk";
import { POSE_STARRY_POOP } from "./themeArtStarryPosePoop";
import { POSE_OCEAN_EAT } from "./themeArtOceanPoseEat";
import { POSE_OCEAN_PLAY } from "./themeArtOceanPosePlay";
import { POSE_OCEAN_GROOM } from "./themeArtOceanPoseGroom";
import { POSE_OCEAN_SLEEP } from "./themeArtOceanPoseSleep";
import { POSE_OCEAN_TALK } from "./themeArtOceanPoseTalk";
import { POSE_OCEAN_POOP } from "./themeArtOceanPosePoop";

export interface ThemeCatArt {
  /** Circular launcher portrait. */
  portrait: string;
  /**
   * Full-scene artwork per pose (cat + environment baked in).
   * `idle` is the base scene.
   */
  poses: Record<CatPose, string>;
}

function makeArt(
  portrait: string,
  idle: string,
  eat: string,
  play: string,
  groom: string,
  sleep: string,
  talk: string,
  poop: string
): ThemeCatArt {
  return { portrait, poses: { idle, eat, play, groom, sleep, talk, poop } };
}

/**
 * Custom cat art per theme. Cozy has no entry — it uses the original
 * 7-pose artwork (CAT_POSES) and room (CAT_BACKGROUND).
 */
export const THEME_CAT_ART: Partial<Record<ThemeId, ThemeCatArt>> = {
  cyberpunk: makeArt(
    PORTRAIT_CYBERPUNK,
    SCENE_CYBERPUNK,
    POSE_CYBERPUNK_EAT,
    POSE_CYBERPUNK_PLAY,
    POSE_CYBERPUNK_GROOM,
    POSE_CYBERPUNK_SLEEP,
    POSE_CYBERPUNK_TALK,
    POSE_CYBERPUNK_POOP
  ),
  verdant: makeArt(
    PORTRAIT_VERDANT,
    SCENE_VERDANT,
    POSE_VERDANT_EAT,
    POSE_VERDANT_PLAY,
    POSE_VERDANT_GROOM,
    POSE_VERDANT_SLEEP,
    POSE_VERDANT_TALK,
    POSE_VERDANT_POOP
  ),
  starry: makeArt(
    PORTRAIT_STARRY,
    SCENE_STARRY,
    POSE_STARRY_EAT,
    POSE_STARRY_PLAY,
    POSE_STARRY_GROOM,
    POSE_STARRY_SLEEP,
    POSE_STARRY_TALK,
    POSE_STARRY_POOP
  ),
  ocean: makeArt(
    PORTRAIT_OCEAN,
    SCENE_OCEAN,
    POSE_OCEAN_EAT,
    POSE_OCEAN_PLAY,
    POSE_OCEAN_GROOM,
    POSE_OCEAN_SLEEP,
    POSE_OCEAN_TALK,
    POSE_OCEAN_POOP
  ),
};
