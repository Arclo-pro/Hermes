import React from "react";

type CardProps = {
  title?: string;
  description?: string;
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Card({ title, description, rightSlot, children, footer, className }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-surface-border bg-surface-primary shadow-sm",
        "transition-shadow hover:shadow-md",
        className
      )}
    >
      {(title || description || rightSlot) ? (
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div className="min-w-0">
            {title ? (
              <div className="text-sm font-semibold text-text-primary">
                {title}
              </div>
            ) : null}
            {description ? (
              <div className="mt-1 text-xs text-text-secondary">
                {description}
              </div>
            ) : null}
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>
      ) : null}

      {children ? <div className="px-5 pb-5 pt-4">{children}</div> : null}

      {footer ? (
        <div className="border-t border-surface-border px-5 py-4">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
