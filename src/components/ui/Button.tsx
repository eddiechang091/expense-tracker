import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "warm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  block?: boolean;
  children: ReactNode;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "",
  secondary: "secondary",
  ghost: "ghost",
  danger: "danger",
  warm: "btn-warm",
};

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = ["btn"];
  const variantClass = VARIANT_CLASS[variant];
  if (variantClass) classes.push(variantClass);
  if (size === "sm") classes.push("small");
  if (block) classes.push("block");
  if (className) classes.push(className);
  return (
    <button className={classes.join(" ")} {...rest}>
      {children}
    </button>
  );
}
