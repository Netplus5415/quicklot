import type { HTMLAttributes, ReactNode } from "react";

type Padding = "none" | "sm" | "md" | "lg";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  bordered?: boolean;
  children: ReactNode;
}

const PADDING: Record<Padding, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export function Card({
  padding = "md",
  bordered = true,
  className = "",
  children,
  ...props
}: CardProps) {
  const classes = [
    "rounded-[6px] bg-white",
    bordered ? "border border-[#E5E7EB]" : "",
    PADDING[padding],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={["mb-4 flex items-center justify-between gap-3", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={["text-base font-semibold text-gray-900", className].filter(Boolean).join(" ")}>{children}</h3>;
}

export function CardDescription({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={["text-sm text-gray-500", className].filter(Boolean).join(" ")}>{children}</p>;
}
