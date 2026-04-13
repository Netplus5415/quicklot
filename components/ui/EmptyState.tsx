import type { ReactNode } from "react";
import Link from "next/link";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  const actionClasses =
    "inline-flex items-center justify-center rounded-lg bg-[#FF7D07] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e56c00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7D07] focus-visible:ring-offset-2";

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
      {icon && <div className="mb-4 text-4xl opacity-70">{icon}</div>}
      <h3 className="mb-1.5 text-base font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mb-5 max-w-md text-sm text-gray-500">{description}</p>
      )}
      {actionLabel &&
        (actionHref ? (
          <Link href={actionHref} className={actionClasses}>
            {actionLabel}
          </Link>
        ) : onAction ? (
          <button type="button" onClick={onAction} className={actionClasses}>
            {actionLabel}
          </button>
        ) : null)}
    </div>
  );
}
