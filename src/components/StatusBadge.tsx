import { cn } from "@/lib/utils";
import { StatusEntrega } from "@/types/fiscal";
import { CheckCircle2, XCircle, Minus } from "lucide-react";

interface StatusBadgeProps {
  status: StatusEntrega;
  className?: string;
}

const config: Record<StatusEntrega, { label: string; icon: typeof CheckCircle2; colorClass: string }> = {
  ok: { label: "OK", icon: CheckCircle2, colorClass: "text-[hsl(var(--success))] bg-[hsl(var(--success)/0.1)]" },
  pendente: { label: "Pendente", icon: XCircle, colorClass: "text-destructive bg-destructive/10" },
  nao_aplicavel: { label: "N/A", icon: Minus, colorClass: "text-muted-foreground bg-muted" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, icon: Icon, colorClass } = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", colorClass, className)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
