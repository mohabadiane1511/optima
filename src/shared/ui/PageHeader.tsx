import { cn } from "@/lib/utils";

export function PageHeader({
    title,
    subtitle,
    actions,
    className = "",
}: {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("mb-4 flex items-center justify-between gap-4", className)}>
            <div>
                {subtitle ? (
                    <div className="text-sm text-black/60 dark:text-white/60">{subtitle}</div>
                ) : null}
                <h1 className="text-2xl font-semibold">{title}</h1>
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
    );
}


