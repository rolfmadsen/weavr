import React, { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
}

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export const GlassButton: React.FC<GlassButtonProps> = ({
    className,
    variant = 'primary',
    size = 'md',
    children,
    ...props
}) => {
    const baseStyles = "rounded-full transition-all duration-300 font-medium flex items-center justify-center backdrop-blur-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

    const variants = {
        primary: "bg-gradient-to-r from-purple-500/80 to-blue-500/80 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/30 border border-white/20",
        secondary: "bg-white/10 hover:bg-white/20 text-slate-800 dark:text-slate-100 border border-white/10 dark:border-white/5",
        ghost: "bg-transparent hover:bg-white/10 text-slate-600 dark:text-slate-300",
        danger: "bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs text-sm",
        md: "px-6 py-2 text-sm",
        lg: "px-8 py-3 text-base"
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            {...props}
        >
            {children}
        </button>
    );
};
