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
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium mb-2 dark:text-white">
                    {label}
                </label>
            )}

            <div className="relative">
                {startIcon && (
                    <div className="absolute inset-y-0 start-0 flex items-center pointer-events-none z-20 ps-4 text-gray-500">
                        {startIcon}
                    </div>
                )}

                <input
                    ref={ref}
                    id={id}
                    className={cn(
                        "py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600",
                        !!startIcon && "ps-11",
                        error && "border-red-500 focus:border-red-500 focus:ring-red-500",
                        className
                    )}
                    {...props}
                />
            </div>

            {error && (
                <p className="text-sm text-red-600 mt-2" id={`${id}-error`}>
                    {error}
                </p>
            )}
        </div>
    );
});

GlassInput.displayName = 'GlassInput';
