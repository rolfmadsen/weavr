import React from 'react';
import { useTranslation } from 'react-i18next';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

import { Button } from '../../../shared/components/ui/button';
import { GlassTooltip } from '../../../shared/components/GlassTooltip';

interface HelpButtonProps {
    onClick: () => void;
    className?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ onClick, className }) => {
    const { t } = useTranslation();

    return (
        <GlassTooltip content={`${t('workspace.header.help')} (H)`}>
            <Button
                onClick={onClick}
                aria-label={t('workspace.header.help')}
                variant="glass"
                className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ease-out border border-white/20 backdrop-blur-md outline-none bg-purple-600 hover:bg-purple-700 hover:scale-105 hover:shadow-purple-500/40 active:scale-95 text-white pointer-events-auto p-0",
                    className
                )}
            >
                <span className="text-4xl md:text-2xl font-black leading-none select-none">?</span>
            </Button>
        </GlassTooltip>
    );
};
