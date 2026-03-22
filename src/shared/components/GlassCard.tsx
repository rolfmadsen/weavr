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
    const baseStyles = "transition-all duration-300";

    const variants = {
        // Standard Card
        card: "glass-card flex flex-col p-4",

        // Sidebar / Pannel (slightly different borders for layout)
        sidebar: "bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl border-r border-white/20 dark:border-white/5",

        // High Contrast Panel (Popovers, Modals)
        panel: "glass-card flex flex-col shadow-2xl p-6"
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
