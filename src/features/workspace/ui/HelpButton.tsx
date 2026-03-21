import React from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface HelpButtonProps {
    onClick: () => void;
    className?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ onClick, className }) => {
    const { t } = useTranslation();

    return (
        <button
            onClick={onClick}
            aria-label={t('workspace.header.help')}
            className={cn(
                "w-16 h-16 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ease-out border border-white/20 backdrop-blur-md outline-none bg-purple-600 hover:bg-purple-700 hover:scale-105 hover:shadow-purple-500/40 active:scale-95 text-white pointer-events-auto",
                className
            )}
            title={t('workspace.header.help')}
        >
            <HelpCircle className="w-6 h-6 md:w-7 md:h-7" />
        </button>
    );
};
