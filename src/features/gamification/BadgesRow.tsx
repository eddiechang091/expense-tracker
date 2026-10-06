import { BADGE_DEFS, type BadgeDef } from "./badges";

export function BadgesRow({
  unlockedIds,
  onSelect,
}: {
  unlockedIds: ReadonlySet<string>;
  onSelect?: (badge: BadgeDef) => void;
}) {
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
          const clickable = unlocked && onSelect;
          return (
            <div
              key={b.id}
              role={clickable ? "button" : "listitem"}
              title={
                unlocked
                  ? `${b.name} — unlocked!${onSelect ? " Click to share." : ""}`
                  : `${b.name}: ${b.hint}`
              }
              className={`badge${unlocked ? " is-unlocked" : " is-locked"}${clickable ? " is-clickable" : ""}`}
              {...(clickable
                ? {
                    onClick: () => onSelect(b),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(b);
                      }
                    },
                    tabIndex: 0,
                  }
                : {})}
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
