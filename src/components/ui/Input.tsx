import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <span className="muted">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={["input", className].filter(Boolean).join(" ")} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={["select", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={["textarea", className].filter(Boolean).join(" ")} {...rest} />;
}

export function AmountInput({
  currencySymbol = "$",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { currencySymbol?: string }) {
  return (
    <span className="control">
      <span className="amount-prefix" aria-hidden="true">
        {currencySymbol}
      </span>
      <input className="input input-amount" inputMode="decimal" {...rest} />
    </span>
  );
}
