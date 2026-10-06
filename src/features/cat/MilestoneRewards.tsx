// Cat companion milestone rewards — shown alongside badges on the profile.
//
// Milestones reward consistent expense logging with cat items. The longer
// the history, the richer the reward. Claiming opens a progressive
// celebration revealing each item won.

import { useState } from "react";
import { useCat } from "@/services/cat/useCat";
import { CAT_MILESTONES } from "@/services/cat/milestones";
import type { CatItem, ExpenseStats } from "@/services/cat/types";
import { RewardCelebration } from "./RewardCelebration";

export function MilestoneRewards({ stats }: { stats: ExpenseStats }) {
  const { state, claimMilestone } = useCat();
  const [celebration, setCelebration] = useState<{ title: string; items: CatItem[] } | null>(null);

  const doClaim = (id: string, title: string) => {
    const items = claimMilestone(id, stats);
    if (items && items.length > 0) {
      setCelebration({ title, items });
    }
  };

  return (
    <div className="milestone-list">
      <h3 className="milestone-title">🐱 Lucky Cat Milestones</h3>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>
        Keep logging to unlock goodies for your cat! The longer your history, the richer the rewards.
      </p>
      {CAT_MILESTONES.map((m) => {
        const unlocked = m.isUnlocked(stats, state.checkinStreak);
        const claimed = state.claimedMilestones.includes(m.id);
        return (
          <div key={m.id} className={`milestone-row${claimed ? " is-claimed" : ""}${unlocked && !claimed ? " is-unlocked" : ""}`}>
            <div className="milestone-info">
              <span className="milestone-name">
                {claimed ? "✅" : unlocked ? "🎁" : "🔒"} {m.title}
              </span>
              <span className="muted" style={{ fontSize: 12 }}>{m.description}</span>
            </div>
            {claimed ? (
              <span className="muted" style={{ fontSize: 12 }}>Claimed</span>
            ) : unlocked ? (
              <button className="milestone-claim" onClick={() => doClaim(m.id, m.title)}>
                Claim
              </button>
            ) : (
              <span className="muted" style={{ fontSize: 12 }}>Locked</span>
            )}
          </div>
        );
      })}
      {celebration && (
        <RewardCelebration
          title={celebration.title}
          items={celebration.items}
          onDone={() => setCelebration(null)}
        />
      )}
    </div>
  );
}
