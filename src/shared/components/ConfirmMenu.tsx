import { useTranslation } from 'react-i18next';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface ConfirmMenuProps {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    message: string;
    confirmLabel?: string;
}

const ConfirmMenu: React.FC<ConfirmMenuProps> = ({
    open,
    onClose,
    onConfirm,
    message,
    confirmLabel
}) => {
    const { t } = useTranslation();
    const finalConfirmLabel = confirmLabel || t('common.confirmDelete');
    // Note: anchorEl is unused in this centered modal implementation, 
    // but kept in interface to avoid breaking call sites immediately 
    // (though we can remove it from call sites later).

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={(e) => {
            e.stopPropagation();
            onClose();
        }}>
            <GlassCard
                variant="panel"
                className={cn(
                    "w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 border-red-500/30 ring-1 ring-red-500/20"
                )}
                onClick={e => e.stopPropagation()}
            >
                <p className="text-slate-800 dark:text-slate-200 mb-6 font-medium leading-relaxed">
                    {message}
                </p>

                <div className="flex justify-end gap-3">
                    <GlassButton variant="ghost" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onClose();
                    }}>
                        {t('common.cancel')}
                    </GlassButton>
                    <GlassButton
                        variant="danger"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onConfirm();
                            onClose();
                        }}
                    >
                        {finalConfirmLabel}
                    </GlassButton>
                </div>
            </GlassCard>
        </div>
    );
};

export default ConfirmMenu;
