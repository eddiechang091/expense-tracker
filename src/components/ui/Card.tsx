import type { ReactNode } from "react";

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const classes = ["card"];
  if (className) classes.push(className);
  return (
    <section className={classes.join(" ")}>
      <div className="stack">
        {title || action ? (
          <div className="card-head">
            {title ? <h2 className="card-title">{title}</h2> : <span />}
            {action}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
