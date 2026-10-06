import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { BadgeDef } from "./badges";
import {
  generateBadgeSnapshot,
  shareSnapshot,
} from "./shareSnapshot";

export function BadgeCelebration({
  badges,
  displayName,
  streakDays,
  onDone,
}: {
  /** Newly unlocked badges, shown one at a time. */
  badges: BadgeDef[];
  displayName: string;
  streakDays: number;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const { notify } = useToast();
  const badge = badges[index];

  useEffect(() => {
    setIndex(0);
  }, [badges]);

  if (!badge) return null;

  const next = () => {
    if (index + 1 < badges.length) {
      setIndex(index + 1);
    } else {
      onDone();
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await generateBadgeSnapshot({
        badgeEmoji: badge.emoji,
        badgeName: badge.name,
        badgeHint: badge.hint,
        displayName,
        streakDays,
        dateLabel: new Date().toLocaleDateString("en", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
      });
      const outcome = await shareSnapshot(blob, `I unlocked "${badge.name}"!`);
      if (outcome === "downloaded") notify("Snapshot downloaded — share it anywhere!");
      if (outcome === "shared") notify("Shared! 🎉");
    } catch {
      notify("Couldn't make the snapshot this time.", "error");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      className="celebration-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Badge unlocked: ${badge.name}`}
      onClick={next}
    >
      <div className="celebration-card" onClick={(e) => e.stopPropagation()}>
        <p className="celebration-kicker">🏅 Badge unlocked!</p>
        <div key={badge.id} className="celebration-emoji" aria-hidden="true">
          {badge.emoji}
        </div>
        <h2 className="celebration-name">{badge.name}</h2>
        <p className="celebration-hint muted">{badge.hint}</p>
        {badges.length > 1 && (
          <p className="celebration-progress muted">
            {index + 1} of {badges.length}
          </p>
        )}
        <div className="celebration-actions">
          <Button onClick={handleShare} disabled={sharing}>
            {sharing ? "Making snapshot…" : "Share"}
          </Button>
          <Button variant="ghost" onClick={next}>
            {index + 1 < badges.length ? "Next" : "Keep going"}
          </Button>
        </div>
      </div>
    </div>
  );
}
