import React, { ButtonHTMLAttributes } from 'react';
import { Button, buttonVariants } from './ui/button';
import { VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    variant?: any;
    size?: any;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
    className,
    variant = 'primary',
    size = 'md',
    children,
    ...props
}) => {
    // Map legacy variants to shadcn
    const shadcnVariant = variant === 'primary' ? 'default' : 
                         variant === 'secondary' ? 'outline' : 
                         variant === 'ghost' ? 'ghost' : 
                         variant === 'danger' ? 'destructive' : variant;

    const shadcnSize = size === 'sm' ? 'sm' : 
                      size === 'md' ? 'default' : 
                      size === 'lg' ? 'lg' : size;

    return (
        <Button
            variant={shadcnVariant}
            size={shadcnSize}
            className={cn("glass-button", className)}
            {...props}
        >
            {children}
        </Button>
    );
};
