import type { HTMLAttributes, ReactNode } from "react";

type Variant = "success" | "warning" | "error" | "info" | "neutral" | "verified";
type Size = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  success: "bg-[#ECFDF5] text-[#065F46]",
  warning: "bg-[#FFFBEB] text-[#92400E]",
  error:   "bg-[#FEF2F2] text-[#991B1B]",
  info:    "bg-[#EFF6FF] text-[#1E40AF]",
  neutral: "bg-[#F3F4F6] text-[#374151]",
  verified: "bg-[#FF7D07] text-white",
};

const SIZES: Record<Size, string> = {
  sm: "text-[0.65rem] px-[0.4rem] py-[0.15rem]",
  md: "text-[0.7rem] px-[0.5rem] py-[0.2rem]",
};

export function Badge({
  variant = "neutral",
  size = "md",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const classes = [
    "inline-flex items-center gap-1 rounded-[3px] font-bold uppercase tracking-[0.06em]",
    VARIANTS[variant],
    SIZES[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
