import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";

// ── Input ──

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
}

const INPUT_BASE =
  "w-full rounded-[4px] border-[1.5px] bg-white px-3 py-2 text-[0.875rem] text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";

const LABEL_CLASS =
  "text-[0.75rem] font-semibold uppercase tracking-[0.05em] text-[#374151] mb-[0.35rem]";

const FOCUS_OK =
  "border-[#D1D5DB] focus:border-[#FF7D07] focus:shadow-[0_0_0_3px_rgba(255,125,7,0.12)]";
const FOCUS_ERROR =
  "border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, leftIcon, className = "", id, ...props },
  ref
) {
  const reactId = useId();
  const inputId = id ?? reactId;

  const borderClass = error ? FOCUS_ERROR : FOCUS_OK;

  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={inputId} className={LABEL_CLASS}>
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            INPUT_BASE,
            borderClass,
            leftIcon ? "pl-10" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="mt-1 text-xs text-gray-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

// ── Textarea ──

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, helperText, className = "", id, ...props },
  ref
) {
  const reactId = useId();
  const inputId = id ?? reactId;

  const borderClass = error ? FOCUS_ERROR : FOCUS_OK;

  return (
    <div className="flex flex-col">
      {label && (
        <label htmlFor={inputId} className={LABEL_CLASS}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={[INPUT_BASE, borderClass, "resize-y", className].filter(Boolean).join(" ")}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="mt-1 text-xs text-gray-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});
