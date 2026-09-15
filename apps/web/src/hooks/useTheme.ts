import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "srouter-theme";

function getInitialTheme(): Theme {
    if (typeof window === "undefined") return "dark";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("dark", theme === "dark");
        root.style.colorScheme = theme;
        window.localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        const next = theme === "dark" ? "light" : "dark";

        document.documentElement.classList.toggle("dark", next === "dark");
        document.documentElement.style.colorScheme = next;
        window.localStorage.setItem(STORAGE_KEY, next);
        setTheme(next);
    }, [theme]);

    return { theme, toggleTheme };
}
