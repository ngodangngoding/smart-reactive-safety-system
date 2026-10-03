export const labelClass = "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground";

export const fieldClass =
  "w-full h-9 rounded-sm border bg-card px-3 text-xs text-foreground placeholder:text-text-disabled " +
  "focus-visible:border-primary focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] " +
  "read-only:bg-surface-subtle";

export default function TextInput({
  id,
  label,
  error,
  touched,
  required = false,
  className = "",
  endAdornment,
  ...props
}) {
  const showError = Boolean(error && touched);

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={showError}
          aria-describedby={showError ? `${id}-error` : undefined}
          className={`${fieldClass} ${endAdornment ? "pr-11" : ""} ${showError ? "border-danger" : "border-border-strong"}`}
          {...props}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-0.5 flex items-center">{endAdornment}</div>
        )}
      </div>
      {showError && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[11px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
