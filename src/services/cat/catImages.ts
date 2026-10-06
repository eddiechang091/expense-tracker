// Interactive lucky cat — 2D artwork as data URIs.
// Re-exports the split image parts (each under push size limits).

import { CAT_BACKGROUND } from "./catImagesBg";
import { CAT_POSES_A } from "./catImagesA";
import { CAT_POSES_B } from "./catImagesB";

export type CatPose =
  | "idle"
  | "eat"
  | "play"
  | "groom"
  | "sleep"
  | "talk"
  | "poop";

export { CAT_BACKGROUND };

export const CAT_POSES: Record<CatPose, string> = {
  ...(CAT_POSES_A as Record<CatPose, string>),
  ...(CAT_POSES_B as Record<CatPose, string>),
};
