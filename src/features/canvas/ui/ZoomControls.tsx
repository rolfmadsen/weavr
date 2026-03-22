import { useTranslation } from 'react-i18next';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

import { Button } from '../../../shared/components/ui/button';
import { GlassTooltip } from '../../../shared/components/GlassTooltip';

interface ZoomControlsProps {
    scale: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
    scale,
    onZoomIn,
    onZoomOut,
    onResetZoom
}) => {
    const { t } = useTranslation();
    const zoomDisplay = Math.round((scale - 1.0) * 100);
    const formattedZoom = zoomDisplay > 0 ? `+${zoomDisplay}` : `${zoomDisplay}`;

    return (
        <div className={cn(
            "flex items-center gap-1 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-lg rounded-full p-1 border border-white/20 dark:border-white/10 animate-in slide-in-from-bottom-2 fade-in mt-4"
        )}>
            <GlassTooltip content={`${t('canvas.zoomOut')} (Ctrl -)`}>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onZoomOut}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-purple-500/50 p-0"
                >
                    <ZoomOut size={16} />
                </Button>
            </GlassTooltip>

            <GlassTooltip content={`${t('canvas.resetZoom', { zoom: formattedZoom })} (Ctrl 0)`}>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onResetZoom}
                    className="px-3 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-all active:scale-95 outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                    {formattedZoom}%
                </Button>
            </GlassTooltip>

            <GlassTooltip content={`${t('canvas.zoomIn')} (Ctrl +)`}>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onZoomIn}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all active:scale-95 outline-none focus:ring-2 focus:ring-purple-500/50 p-0"
                >
                    <ZoomIn size={16} />
                </Button>
            </GlassTooltip>
        </div>
    );
};
