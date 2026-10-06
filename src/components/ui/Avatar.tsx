import { avatarSrc } from "@/services/profile/avatars";

/** Renders the gallery image, falling back to the legacy emoji. */
export function Avatar({
  avatarId,
  avatarEmoji,
  size = 40,
  className,
}: {
  avatarId?: string;
  avatarEmoji?: string;
  size?: number;
  className?: string;
}) {
  const src = avatarSrc(avatarId);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: "50%", objectFit: "cover" }}
      />
    );
  }
  return (
    <span className={className} aria-hidden="true" style={{ fontSize: size * 0.6 }}>
      {avatarEmoji ?? "😊"}
    </span>
  );
}
