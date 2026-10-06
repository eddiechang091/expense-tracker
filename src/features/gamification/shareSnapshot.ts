// ---------------------------------------------------------------------------
// Badge share snapshot — renders a shareable achievement image on canvas.
// ---------------------------------------------------------------------------

export interface SnapshotData {
  badgeEmoji: string;
  badgeName: string;
  badgeHint: string;
  displayName: string;
  streakDays: number;
  dateLabel: string;
}

const W = 1080;
const H = 1350;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function generateBadgeSnapshot(data: SnapshotData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  // Warm gradient background.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#fff7ed");
  bg.addColorStop(0.55, "#fdf8f3");
  bg.addColorStop(1, "#f3e9dc");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft decorative circles.
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#6c5ce7";
  ctx.beginPath();
  ctx.arc(W * 0.85, H * 0.12, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#35c286";
  ctx.beginPath();
  ctx.arc(W * 0.12, H * 0.88, 230, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.fillStyle = "#2b2a33";

  // Brand.
  ctx.font = "700 44px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#6c5ce7";
  ctx.fillText("Money Companion", W / 2, 150);
  ctx.font = "500 32px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#6f6b7a";
  ctx.fillText("Achievement unlocked", W / 2, 205);

  // Badge medallion.
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(43,42,51,0.12)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 18;
  ctx.beginPath();
  ctx.arc(W / 2, 560, 210, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.font = "240px serif";
  ctx.fillText(data.badgeEmoji, W / 2, 645);

  // Badge name + hint.
  ctx.fillStyle = "#2b2a33";
  ctx.font = "800 72px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(data.badgeName, W / 2, 880);
  ctx.font = "500 36px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#6f6b7a";
  ctx.fillText(data.badgeHint, W / 2, 940);

  // Streak pill.
  const pillText = `🔥 ${data.streakDays}-day streak`;
  ctx.font = "700 40px 'Plus Jakarta Sans', system-ui, sans-serif";
  const pillW = ctx.measureText(pillText).width + 90;
  ctx.fillStyle = "#efeafe";
  roundRect(ctx, W / 2 - pillW / 2, 1000, pillW, 84, 42);
  ctx.fill();
  ctx.fillStyle = "#5847d6";
  ctx.fillText(pillText, W / 2, 1055);

  // Footer.
  ctx.font = "500 30px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#9a94a8";
  ctx.fillText(`${data.displayName} · ${data.dateLabel}`, W / 2, 1230);
  ctx.fillText("Track your money story, one day at a time.", W / 2, 1280);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("snapshot render failed"));
    }, "image/png");
  });
}

export type ShareOutcome = "shared" | "downloaded" | "cancelled";

/** Share via the OS sheet when possible, otherwise download the PNG. */
export async function shareSnapshot(blob: Blob, title: string): Promise<ShareOutcome> {
  const file = new File([blob], "money-companion-badge.png", { type: "image/png" });
  try {
    if (
      typeof navigator !== "undefined" &&
      "share" in navigator &&
      "canShare" in navigator &&
      (navigator as Navigator & { canShare: (d: ShareData) => boolean }).canShare({ files: [file] })
    ) {
      await navigator.share({
        files: [file],
        title,
        text: `${title} — tracked with Money Companion 🌱`,
      });
      return "shared";
    }
  } catch (err) {
    // User dismissed the share sheet.
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
  }
  // Fallback: download.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "money-companion-badge.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "downloaded";
}
