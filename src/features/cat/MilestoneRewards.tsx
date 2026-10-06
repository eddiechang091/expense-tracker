// Cat companion milestone rewards — shown alongside badges on the profile.
//
// Milestones reward consistent expense logging with cat items. The longer
// the history, the richer the reward.

import { useState } from "react";
import { useCat } from "@/services/cat/useCat";
import { CAT_MILESTONES, rollMilestoneRewards } from "@/services/cat/milestones";
import { getItem } from "@/services/cat/items";
import type { CatItem, ExpenseStats } from "@/services/cat/types";
import { playPop } from "@/services/cat/sounds";

export function MilestoneRewards({ stats }: { stats: ExpenseStats }) {
  const { state, claimMilestone } = useCat();
  const [justClaimed, setJustClaimed] = useState<{ id: string; items: CatItem[] } | null>(null);

  const doClaim = (id: string) => {
    const items = claimMilestone(id, stats);
    if (items) {
      playPop();
      setJustClaimed({ id, items });
      window.setTimeout(() => setJustClaimed(null), 5000);
    }
  };

  return (
    <div className="milestone-list">
      <h3 className="milestone-title">🐱 招财猫里程碑</h3>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>
        坚持记账，解锁猫咪道具！记账历史越长，奖励越丰富。
      </p>
      {CAT_MILESTONES.map((m) => {
        const unlocked = m.isUnlocked(stats, state.checkinStreak);
        const claimed = state.claimedMilestones.includes(m.id);
        // Preview rewards (rolled at claim time; show the tier size).
        return (
          <div key={m.id} className={`milestone-row${claimed ? " is-claimed" : ""}${unlocked && !claimed ? " is-unlocked" : ""}`}>
            <div className="milestone-info">
              <span className="milestone-name">
                {claimed ? "✅" : unlocked ? "🎁" : "🔒"} {m.title}
              </span>
              <span className="muted" style={{ fontSize: 12 }}>{m.description}</span>
            </div>
            {claimed ? (
              <span className="muted" style={{ fontSize: 12 }}>已领取</span>
            ) : unlocked ? (
              <button className="milestone-claim" onClick={() => doClaim(m.id)}>
                领取
              </button>
            ) : (
              <span className="muted" style={{ fontSize: 12 }}>未解锁</span>
            )}
          </div>
        );
      })}
      {justClaimed && (
        <div className="cat-notice">
          🎉 获得：{justClaimed.items.map((i) => `${i.emoji}${i.name}`).join("、")}
        </div>
      )}
    </div>
  );
}

/** Preview helper (for tests). */
export function previewRewardsFor(milestoneId: string, stats: ExpenseStats): string[] {
  return rollMilestoneRewards(milestoneId, stats);
}

export function itemName(id: string): string {
  return getItem(id)?.name ?? id;
}
