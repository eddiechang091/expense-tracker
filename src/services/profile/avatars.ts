// Curated avatar gallery — generated artwork bundled with the app,
// from cute to cyberpunk. (Anna offers no user-upload API today;
// `anna.upload` exists but needs a per-app user grant — the gallery
// is instant and offline-friendly.)

export interface AvatarDef {
  id: string;
  label: string;
  src: string;
}

const modules = import.meta.glob<string>("/src/assets/avatars/avatar-*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const ORDER = [
  "avatar-cat-cute",
  "avatar-lucky-cat",
  "avatar-fox",
  "avatar-panda",
  "avatar-shiba",
  "avatar-robot",
  "avatar-astro-cat",
  "avatar-dragon",
  "avatar-samurai",
  "avatar-neon-ghost",
];

const LABELS: Record<string, string> = {
  "avatar-cat-cute": "Mochi Cat",
  "avatar-lucky-cat": "Lucky Cat",
  "avatar-fox": "Fox",
  "avatar-panda": "Panda",
  "avatar-shiba": "Shiba",
  "avatar-robot": "Bolt",
  "avatar-astro-cat": "Astro Cat",
  "avatar-dragon": "Dragon",
  "avatar-samurai": "Neon Samurai",
  "avatar-neon-ghost": "Neon Ghost",
};

export const AVATARS: AvatarDef[] = ORDER.flatMap((id) => {
  const key = Object.keys(modules).find((k) => k.endsWith(`/${id}.webp`));
  if (!key) return [];
  return [{ id, label: LABELS[id] ?? id, src: modules[key] }];
});

export function avatarSrc(id: string | undefined): string | null {
  if (!id) return null;
  return AVATARS.find((a) => a.id === id)?.src ?? null;
}
