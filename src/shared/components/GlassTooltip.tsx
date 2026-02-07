import React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

export const GlassTooltip = ({ children, content }: { children: React.ReactNode, content: React.ReactNode }) => (
    <Tooltip.Provider>
        <Tooltip.Root>
            <Tooltip.Trigger asChild>
                <span className="cursor-help inline-flex items-center">{children}</span>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content className="z-[100] max-w-xs p-3 text-sm text-slate-100 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200" sideOffset={5}>
                    {content}
                    <Tooltip.Arrow className="fill-slate-900/90" />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    </Tooltip.Provider>
);
