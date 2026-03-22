import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

interface ConfirmMenuProps {
    anchorEl?: HTMLElement | null; // Keep for backward compatibility
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    message: string;
    confirmLabel?: string;
    title?: string;
}

const ConfirmMenu: React.FC<ConfirmMenuProps> = ({
    open,
    onClose,
    onConfirm,
    message,
    confirmLabel,
    title
}) => {
    const { t } = useTranslation();
    const finalConfirmLabel = confirmLabel || t('common.confirmDelete');
    const finalTitle = title || t('common.confirm');

    return (
        <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <AlertDialogContent className="glass-card max-w-sm border-red-500/30 ring-1 ring-red-500/20">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-slate-800 dark:text-white">
                        {finalTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
                        {message}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel 
                        className="glass-button border-white/20 hover:bg-white/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                    >
                        {t('common.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className={cn(
                            buttonVariants({ variant: "destructive" }),
                            "shadow-lg shadow-red-500/20"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onConfirm();
                            onClose();
                        }}
                    >
                        {finalConfirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ConfirmMenu;
