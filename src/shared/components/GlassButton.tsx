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
    const baseStyles = "py-3 px-4 inline-flex items-center gap-x-2 font-medium focus:outline-none disabled:opacity-50 disabled:pointer-events-none transition-all duration-300";
    
    const variants = {
        primary: "text-sm rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:bg-blue-700",
        secondary: "text-sm rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:bg-gray-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700 dark:focus:bg-neutral-700",
        ghost: "text-sm rounded-lg border border-transparent text-gray-800 hover:bg-gray-100 focus:bg-gray-100 dark:text-white dark:hover:bg-neutral-800 dark:focus:bg-neutral-800",
        danger: "text-sm rounded-lg border border-transparent bg-red-500 text-white hover:bg-red-600 focus:bg-red-600"
    };

    const sizes = {
        sm: "py-2 px-3 text-xs",
        md: "py-3 px-4 text-sm",
        lg: "py-4 px-5 text-base"
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
