import type { ReactNode } from "react";

export function Card({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const classes = ["card"];
  if (className) classes.push(className);
  return (
    <section className={classes.join(" ")}>
      <div className="stack">
        {title ? <h2 className="card-title">{title}</h2> : null}
        {children}
      </div>
    </section>
  );
}
