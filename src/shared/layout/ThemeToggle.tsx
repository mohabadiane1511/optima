"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
    const [isDark, setIsDark] = useState<boolean>(false);

    useEffect(() => {
        const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
        const shouldDark = stored ? stored === "dark" : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
        setIsDark(shouldDark);
        document.documentElement.classList.toggle("dark", shouldDark);
    }, []);

    function toggle() {
        const next = !isDark;
        setIsDark(next);
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("theme", next ? "dark" : "light");
    }

    return (
        <Button variant="outline" className="h-9 w-9 p-0" onClick={toggle} aria-label="Basculer thème">
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
    );
}


