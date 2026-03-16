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
        card: "flex flex-col bg-white border shadow-sm rounded-lg dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70",

        // Sidebar / Pannel (slightly different borders for layout)
        sidebar: "bg-white border-r border-gray-200 dark:bg-neutral-800 dark:border-neutral-700",

        // High Contrast Panel (Popovers, Modals)
        panel: "flex flex-col bg-white border shadow-sm rounded-lg dark:bg-neutral-800 dark:border-neutral-700 dark:shadow-neutral-700/70"
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
