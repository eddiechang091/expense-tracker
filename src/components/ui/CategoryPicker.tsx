import type { Category } from "@/lib/types";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { Select } from "./Input";

export function CategoryPicker({
  value,
  onChange,
  categories = DEFAULT_CATEGORIES,
  includeUncategorized = true,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  categories?: Category[];
  includeUncategorized?: boolean;
  id?: string;
}) {
  return (
    <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
      {includeUncategorized ? <option value="">Uncategorized</option> : null}
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.icon} {category.name}
        </option>
      ))}
    </Select>
  );
}
