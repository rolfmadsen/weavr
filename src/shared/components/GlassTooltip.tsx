import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";

export const GlassTooltip = ({ children, content }: { children: React.ReactNode, content: React.ReactNode }) => {
    if (!content) return <>{children}</>;
    
    return (
        <Tooltip>
            <TooltipTrigger>
                <span>{children}</span>
            </TooltipTrigger>
            <TooltipContent className="glass-card text-slate-800 dark:text-slate-100 border-none shadow-xl">
                {content}
            </TooltipContent>
        </Tooltip>
    );
};
