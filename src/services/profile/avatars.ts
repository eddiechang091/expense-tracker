// Curated avatar gallery (cute -> cyberpunk) for the profile picker.
//
// The images are imported with `?url` so they become base64 data URIs
// baked into the JS bundle. This keeps avatars working even when the host
// only serves the bundle's top-level files (no `assets/` subdirectory).
// Total: 10 x 256px webp, ~70KB -> ~95KB base64.

import avatarCatCute from "/src/assets/avatars/avatar-cat-cute.webp?url";
import avatarLuckyCat from "/src/assets/avatars/avatar-lucky-cat.webp?url";
import avatarFox from "/src/assets/avatars/avatar-fox.webp?url";
import avatarPanda from "/src/assets/avatars/avatar-panda.webp?url";
import avatarShiba from "/src/assets/avatars/avatar-shiba.webp?url";
import avatarRobot from "/src/assets/avatars/avatar-robot.webp?url";
import avatarAstroCat from "/src/assets/avatars/avatar-astro-cat.webp?url";
import avatarDragon from "/src/assets/avatars/avatar-dragon.webp?url";
import avatarSamurai from "/src/assets/avatars/avatar-samurai.webp?url";
import avatarNeonGhost from "/src/assets/avatars/avatar-neon-ghost.webp?url";

export interface AvatarOption {
  id: string;
  label: string;
  src: string;
  emoji: string; // legacy fallback, also used while the image loads
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: "avatar-cat-cute", label: "Mochi Cat", src: avatarCatCute, emoji: "🐱" },
  { id: "avatar-lucky-cat", label: "Lucky Cat", src: avatarLuckyCat, emoji: "🐱" },
  { id: "avatar-fox", label: "Fox", src: avatarFox, emoji: "🦊" },
  { id: "avatar-panda", label: "Panda", src: avatarPanda, emoji: "🐼" },
  { id: "avatar-shiba", label: "Shiba", src: avatarShiba, emoji: "🐶" },
  { id: "avatar-robot", label: "Bolt", src: avatarRobot, emoji: "🤖" },
  { id: "avatar-astro-cat", label: "Astro Cat", src: avatarAstroCat, emoji: "🐱" },
  { id: "avatar-dragon", label: "Dragon", src: avatarDragon, emoji: "🐲" },
  { id: "avatar-samurai", label: "Neon Samurai", src: avatarSamurai, emoji: "🥷" },
  { id: "avatar-neon-ghost", label: "Neon Ghost", src: avatarNeonGhost, emoji: "👻" },
];

export const AVATARS: AvatarOption[] = AVATAR_OPTIONS;

export const DEFAULT_AVATAR_ID = "avatar-lucky-cat";

/** Returns the avatar image (data URI) for an id, or undefined. */
export function avatarSrc(id: string | undefined): string | undefined {
  return getAvatarImage(id);
}

export function getAvatarImage(id: string | undefined): string | undefined {
  if (!id) return undefined;
  return AVATAR_OPTIONS.find((a) => a.id === id)?.src;
}

export function getAvatarEmoji(id: string | undefined): string {
  if (!id) return "🐱";
  return AVATAR_OPTIONS.find((a) => a.id === id)?.emoji ?? "🐱";
}
