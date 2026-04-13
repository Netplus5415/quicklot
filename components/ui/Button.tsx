import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const BASE =
  "inline-flex items-center justify-center gap-2 font-semibold tracking-[0.01em] rounded-[4px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[#FF7D07] text-white hover:bg-[#e56c00] focus-visible:ring-[#FF7D07] disabled:bg-gray-200 disabled:text-gray-400",
  secondary:
    "bg-white text-[#374151] border-[1.5px] border-[#D1D5DB] hover:bg-gray-50 focus-visible:ring-gray-400",
  ghost:
    "bg-transparent text-[#374151] hover:bg-gray-100 focus-visible:ring-gray-400",
  danger:
    "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] hover:bg-red-100 focus-visible:ring-red-400",
};

const SIZES: Record<Size, string> = {
  sm: "text-[0.7rem] px-3 py-[0.35rem]",
  md: "text-xs px-4 py-2",
  lg: "text-sm px-5 py-[0.65rem]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, fullWidth = false, leftIcon, rightIcon, disabled, className = "", children, ...props },
  ref
) {
  const classes = [
    BASE,
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={classes}
      {...props}
    >
      {loading ? (
        <span aria-hidden className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
