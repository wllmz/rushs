import type { SelectHTMLAttributes } from "react";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  errors?: string[];
};

export function SelectField({ name, label, options, errors, ...selectProps }: SelectFieldProps) {
  const errorId = `${name}-error`;
  const hasError = Boolean(errors?.length);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={name}
        name={name}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className="h-10 rounded-md border border-foreground/15 bg-background px-3 text-sm outline-none focus:border-foreground/40 aria-invalid:border-red-500"
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hasError && (
        <p id={errorId} className="text-sm text-red-600">
          {errors?.[0]}
        </p>
      )}
    </div>
  );
}
