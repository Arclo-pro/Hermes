import { NoDeadEndsState } from "./NoDeadEndsState";
import { cn } from "@/lib/utils";
import type { MetaStatus, RemediationAction } from "@shared/noDeadEnds";

interface TableEmptyStateProps {
  meta: MetaStatus;
  title?: string;
  onAction?: (action: RemediationAction) => void;
  isLoading?: boolean;
  className?: string;
  colSpan?: number;
}

export function TableEmptyState({ 
  meta, 
  title = "No data available",
  onAction, 
  isLoading,
  className,
  colSpan,
}: TableEmptyStateProps) {
  const content = (
    <NoDeadEndsState
      meta={meta}
      title={title}
      onAction={onAction}
      isLoading={isLoading}
      className={className}
    />
  );

  if (colSpan !== undefined) {
    return (
      <tr data-testid="table-empty-state">
        <td colSpan={colSpan} className="p-4">
          {content}
        </td>
      </tr>
    );
  }

  return <div data-testid="table-empty-state">{content}</div>;
}
