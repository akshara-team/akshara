import { ChevronDownIcon } from "./icons";

export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const id = `select-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="field field--select">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="field__control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="field__chevron">
        <ChevronDownIcon width={20} height={20} />
      </span>
    </div>
  );
}
