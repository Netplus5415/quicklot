import type { HTMLAttributes, ReactNode } from "react";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl" | "full";
type Background = "white" | "gray";

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  maxWidth?: MaxWidth;
  background?: Background;
  children: ReactNode;
}

const MAX_WIDTH: Record<MaxWidth, string> = {
  sm: "max-w-xl",
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
  full: "max-w-full",
};

const BG: Record<Background, string> = {
  white: "bg-white",
  gray: "bg-gray-50",
};

export function PageContainer({
  maxWidth = "lg",
  background = "white",
  className = "",
  children,
  ...props
}: PageContainerProps) {
  return (
    <div className={[BG[background], "min-h-[calc(100vh-56px)] px-4 py-8 sm:px-6 sm:py-10", className].filter(Boolean).join(" ")} {...props}>
      <div className={["mx-auto", MAX_WIDTH[maxWidth]].join(" ")}>{children}</div>
    </div>
  );
}
