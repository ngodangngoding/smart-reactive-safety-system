import { ChevronDown } from "lucide-react";
import { labelClass, fieldClass } from "./TextInput.jsx";

export default function Select({ id, label, error, touched, required = false, options, placeholder, className = "", ...props }) {
  const showError = Boolean(error && touched);

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={showError}
          aria-describedby={showError ? `${id}-error` : undefined}
          className={`${fieldClass} appearance-none pr-9 ${showError ? "border-danger" : "border-border-strong"}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      </div>
      {showError && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[11px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
