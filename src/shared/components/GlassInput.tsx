import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/utils';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    startIcon?: React.ReactNode;
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
        <div className="w-full space-y-2">
            {label && (
                <Label htmlFor={id} className="ml-1">
                    {label}
                </Label>
            )}

            <div className="relative">
                {startIcon && (
                    <div className="absolute inset-y-0 start-0 flex items-center pointer-events-none z-20 ps-4 text-gray-500">
                        {startIcon}
                    </div>
                )}

                <Input
                    ref={ref}
                    id={id}
                    className={cn(
                        "glass-input h-10 py-3",
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
