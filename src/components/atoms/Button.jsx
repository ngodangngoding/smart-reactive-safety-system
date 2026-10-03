"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

const variants = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "bg-card border border-border-strong text-text-button-secondary hover:bg-surface-subtle",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "bg-transparent text-text-button-secondary hover:bg-surface-subtle",
};

const sizes = {
  md: "h-9 px-3.5",
  sm: "h-8 px-3",
};

const Button = forwardRef(function Button(
  { variant = "primary", size = "md", loading = false, disabled = false, className = "", children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-1.5 rounded-sm text-xs font-semibold
        transition-colors cursor-pointer disabled:cursor-not-allowed ${loading ? "disabled:opacity-75" : "disabled:opacity-50"}
        ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export default Button;
