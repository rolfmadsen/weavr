import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

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
    const zoomDisplay = Math.round((scale - 1.0) * 100);
    const formattedZoom = zoomDisplay > 0 ? `+${zoomDisplay}` : `${zoomDisplay}`;

    return (
        <div className="flex items-center gap-1 bg-white/20 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg rounded-2xl p-1.5 border border-white/20 dark:border-white/10 animate-in slide-in-from-bottom-2 fade-in mt-4">
            <button
                onClick={onZoomOut}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors"
                title="Zoom Out"
            >
                <ZoomOut size={16} />
            </button>

            <button
                onClick={onResetZoom}
                className="min-w-[4rem] h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
                title="Reset Zoom to 0"
            >
                {formattedZoom}
            </button>

            <button
                onClick={onZoomIn}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors"
                title="Zoom In"
            >
                <ZoomIn size={16} />
            </button>
        </div>
    );
};
