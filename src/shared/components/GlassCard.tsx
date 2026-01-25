import React, { HTMLAttributes } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'panel' | 'card' | 'sidebar';
}

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export const GlassCard: React.FC<GlassCardProps> = ({
    className,
    variant = 'card',
    children,
    ...props
}) => {
    const baseStyles = "backdrop-blur-xl transition-all duration-300";

    const variants = {
        // Standard Card (Recipe A)
        card: "bg-white/20 dark:bg-slate-900/40 border border-white/30 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/20 rounded-2xl",

        // Sidebar / Panel (More opaque, straighter edges for layout panels)
        sidebar: "bg-white/40 dark:bg-slate-900/60 border-r border-white/20 dark:border-white/5",

        // High Contrast Panel (Popovers, Modals)
        panel: "bg-white/30 dark:bg-slate-900/70 border border-white/40 dark:border-white/10 shadow-2xl rounded-xl"
    };

    return (
        <div
            className={cn(baseStyles, variants[variant], className)}
            {...props}
        >
            {children}
        </div>
    );
};
