import React from 'react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';

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
    confirmLabel = "Confirm Delete"
}) => {
    // Note: anchorEl is unused in this centered modal implementation, 
    // but kept in interface to avoid breaking call sites immediately 
    // (though we can remove it from call sites later).

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]" onClick={onClose}>
            <GlassCard
                variant="panel"
                className="w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 border-red-500/20"
                onClick={e => e.stopPropagation()}
            >
                <p className="text-slate-800 dark:text-slate-200 mb-6 font-medium leading-relaxed">
                    {message}
                </p>

                <div className="flex justify-end gap-3">
                    <GlassButton variant="ghost" size="sm" onClick={onClose}>
                        Cancel
                    </GlassButton>
                    <GlassButton
                        variant="danger"
                        size="sm"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmLabel}
                    </GlassButton>
                </div>
            </GlassCard>
        </div>
    );
};

export default ConfirmMenu;
