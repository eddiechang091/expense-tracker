import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { AmountInput, Field, Select, Textarea, TextInput } from "@/components/ui/Input";
import { CategoryPicker } from "@/components/ui/CategoryPicker";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { todayIso, parseAmountInput } from "@/lib/utils";
import { validateExpenseDraft, type ExpenseFieldErrors } from "@/lib/validation";

export interface ExpenseFormValues {
  amount: number;
  currency: string;
  categoryId: string | null;
  description: string;
  date: string;
  paymentMethod: string;
  notes: string;
}

const PAYMENT_METHODS = ["Card", "Cash", "Transfer", "Other"];

export function ExpenseForm({
  initial,
  submitLabel,
  saving,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<ExpenseFormValues>;
  submitLabel: string;
  saving: boolean;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const [amountText, setAmountText] = useState(initial?.amount !== undefined ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? "Card");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<ExpenseFieldErrors>({});
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!touched) return;
    const result = validateExpenseDraft({
      amountText,
      categoryId,
      description,
      date,
      paymentMethod,
      notes,
      currency: DEFAULT_CURRENCY,
    });
    setErrors(result.errors);
  }, [amountText, categoryId, description, date, paymentMethod, notes, touched]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    const result = validateExpenseDraft({
      amountText,
      categoryId,
      description,
      date,
      paymentMethod,
      notes,
      currency: DEFAULT_CURRENCY,
    });
    setErrors(result.errors);
    if (!result.value) return;
    await onSubmit({ ...result.value, currency: result.value.currency || DEFAULT_CURRENCY });
  }

  const amountPreview = parseAmountInput(amountText);

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <Field label="Amount" hint={amountPreview !== null ? undefined : "Numbers only, e.g. 12.50"}>
        <AmountInput
          value={amountText}
          onChange={(event) => setAmountText(event.target.value)}
          placeholder="0.00"
          autoFocus
          aria-invalid={errors.amount ? "true" : undefined}
          aria-describedby={errors.amount ? "expense-amount-error" : undefined}
        />
        {errors.amount ? (
          <span id="expense-amount-error" className="field-error" role="alert">
            {errors.amount}
          </span>
        ) : null}
      </Field>
      <Field label="Category">
        <CategoryPicker value={categoryId} onChange={setCategoryId} />
        {errors.category ? (
          <span className="field-error" role="alert">
            {errors.category}
          </span>
        ) : null}
      </Field>
      <Field label="Description" hint="Optional">
        <TextInput
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Weekly groceries"
          maxLength={140}
          aria-invalid={errors.description ? "true" : undefined}
        />
        {errors.description ? (
          <span className="field-error" role="alert">
            {errors.description}
          </span>
        ) : null}
      </Field>
      <Field label="Date">
        <TextInput
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          aria-invalid={errors.date ? "true" : undefined}
        />
        {errors.date ? (
          <span className="field-error" role="alert">
            {errors.date}
          </span>
        ) : null}
      </Field>
      <Field label="Payment method" hint="Optional">
        <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notes" hint="Optional">
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Anything worth remembering"
          rows={2}
          maxLength={500}
        />
        {errors.notes ? (
          <span className="field-error" role="alert">
            {errors.notes}
          </span>
        ) : null}
      </Field>
      <div className="row">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
