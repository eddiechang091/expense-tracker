import type { HeatmapDay, StreakInfo } from "@/lib/streak";

const LEVEL_CLASS = ["hm-0", "hm-1", "hm-2", "hm-3", "hm-4"] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabels(weeks: HeatmapDay[][]): (string | null)[] {
  let prevMonth = -1;
  return weeks.map((week) => {
    const m = Number(week[0].date.slice(5, 7)) - 1;
    if (m !== prevMonth) {
      prevMonth = m;
      return MONTHS[m];
    }
    return null;
  });
}

export function StreakCard({
  streak,
  heatmap,
}: {
  streak: StreakInfo;
  heatmap: HeatmapDay[][];
}) {
  const labels = monthLabels(heatmap);
  const title =
    streak.current > 0 ? (
      <>
        <span className="streak-fire" aria-hidden="true">🔥</span> {streak.current}-day
        streak
      </>
    ) : streak.totalDays > 0 ? (
      <>Your streak is waiting 🌱</>
    ) : (
      <>Start your streak 🌱</>
    );

  return (
    <div className="streak-card">
      <div className="streak-head">
        <h3 className="streak-title">{title}</h3>
        {streak.aliveButIdleToday && (
          <p className="streak-nudge">Log today to keep it going!</p>
        )}
      </div>
      <div className="heatmap" role="img" aria-label={`Activity over the last ${heatmap.length} weeks`}>
        <div className="heatmap-months">
          {labels.map((label, i) => (
            <span key={i} className="heatmap-month">{label ?? ""}</span>
          ))}
        </div>
        <div className="heatmap-grid">
          {heatmap.map((week, wi) => (
            <div key={wi} className="heatmap-week">
              {week.map((day) => (
                <span
                  key={day.date}
                  title={day.placeholder ? undefined : `${day.date}: ${day.count} logged`}
                  className={`heatmap-day ${LEVEL_CLASS[day.level]}${day.placeholder ? " is-placeholder" : ""}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`heatmap-day ${LEVEL_CLASS[l as 0|1|2|3|4]} is-legend`} />
          ))}
          <span>More</span>
        </div>
      </div>
      <p className="streak-meta muted">
        {streak.longest > 0 ? `Longest ${streak.longest} days` : "Log daily to grow your garden"}
        {streak.totalDays > 0 ? ` · ${streak.totalDays} days logged` : ""}
      </p>
    </div>
  );
}
