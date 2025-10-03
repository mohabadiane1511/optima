export function EmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="text-center py-16">
            <div className="text-xl font-semibold">{title}</div>
            {description ? (
                <div className="text-black/60 dark:text-white/60 mt-1">{description}</div>
            ) : null}
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    );
}


