import type { ReactNode } from "react";

/** A native checkbox with its label, so keyboards and screen readers get the real control. */
export function Checkbox({
  checked,
  onChange,
  disabled,
  error,
  id,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className={`checkbox ${error ? "checkbox--error" : ""}`} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          className="checkbox__control"
          checked={checked}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
