import React from 'react';

export const GlassTooltip = ({ children, content }: { children: React.ReactNode, content: React.ReactNode }) => (
    <div className="hs-tooltip [--trigger:hover] [--placement:top] inline-block">
        <div className="hs-tooltip-toggle cursor-help inline-flex items-center">
            {children}
            <div className="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible opacity-0 transition-opacity inline-block absolute invisible z-[100] max-w-xs p-3 text-sm text-slate-100 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl duration-200" role="tooltip">
                {content}
            </div>
        </div>
    </div>
);
