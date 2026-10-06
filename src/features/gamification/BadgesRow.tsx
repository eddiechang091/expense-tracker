import { BADGE_DEFS } from "./badges";

export function BadgesRow({ unlockedIds }: { unlockedIds: ReadonlySet<string> }) {
  const unlockedCount = BADGE_DEFS.filter((b) => unlockedIds.has(b.id)).length;
  return (
    <div className="badges">
      <div className="badges-head">
        <h3 className="badges-title">Badges</h3>
        <span className="muted badges-count">
          {unlockedCount}/{BADGE_DEFS.length}
        </span>
      </div>
      <div className="badges-row" role="list" aria-label="Achievement badges">
        {BADGE_DEFS.map((b) => {
          const unlocked = unlockedIds.has(b.id);
          return (
            <div
              key={b.id}
              role="listitem"
              title={unlocked ? `${b.name} — unlocked!` : `${b.name}: ${b.hint}`}
              className={`badge${unlocked ? " is-unlocked" : " is-locked"}`}
            >
              <span className="badge-emoji" aria-hidden="true">
                {unlocked ? b.emoji : "🔒"}
              </span>
              <span className="badge-name">{b.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
