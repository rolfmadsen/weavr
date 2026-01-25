import React, { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    startIcon?: React.ReactNode;
}

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(({
    className,
    label,
    error,
    startIcon,
    id,
    ...props
}, ref) => {
    return (
        <div className="flex flex-col gap-1.5 w-full">
            {label && (
                <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                    {label}
                </label>
            )}

            <div className="relative group">
                {startIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-purple-500 transition-colors">
                        {startIcon}
                    </div>
                )}

                <input
                    ref={ref}
                    id={id}
                    className={cn(
                        "w-full bg-slate-50 dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-xl",
                        "px-4 py-2.5 outline-none transition-all duration-200",
                        "text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-500",
                        "focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 focus:bg-white/30 dark:focus:bg-black/30",
                        "backdrop-blur-md",
                        !!startIcon && "pl-10",
                        error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20",
                        className
                    )}
                    {...props}
                />
            </div>

            {error && (
                <span className="text-xs text-red-500 ml-1 animate-in slide-in-from-top-1 fade-in">
                    {error}
                </span>
            )}
        </div>
    );
});

GlassInput.displayName = 'GlassInput';
