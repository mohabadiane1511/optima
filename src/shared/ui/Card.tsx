export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={`rounded-xl border bg-white dark:bg-[#0f0f10] shadow-sm dark:shadow-none ${className}`}
            style={{ borderColor: "rgba(0,0,0,.08)" }}
        >
            {children}
        </div>
    );
}

export function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
    return (
        <div className="p-4 border-b" style={{ borderColor: "rgba(0,0,0,.06)" }}>
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="text-sm text-black/60 dark:text-white/60">{subtitle}</div>
                    <div className="text-lg font-semibold">{title}</div>
                </div>
                {right}
            </div>
        </div>
    );
}

export function CardBody({ children, className = "p-4" }: { children: React.ReactNode; className?: string }) {
    return <div className={className}>{children}</div>;
}


