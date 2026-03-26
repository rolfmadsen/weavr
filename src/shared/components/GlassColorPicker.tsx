import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from './ui/popover';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Paintbrush } from 'lucide-react';

interface GlassColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    presets?: string[];
    label?: string;
}

const DEFAULT_PRESETS = [
    '#9333ea', // Purple
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Orange
    '#f43f5e', // Rose
    '#06b6d4', // Cyan
    '#64748b', // Slate
    '#fbbf24', // Amber
    '#000000', // Black
    '#ffffff', // White
];

export const GlassColorPicker: React.FC<GlassColorPickerProps> = ({ 
    color, 
    onChange, 
    presets = DEFAULT_PRESETS,
    label
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="flex flex-col gap-1.5 w-full">
            {label && <Label className="ml-1 text-xs opacity-70">{label}</Label>}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger 
                render={
                    <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-between gap-2 px-3 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                    >
                        <div className="flex items-center gap-2">
                            <div 
                                className="size-4 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm" 
                                style={{ backgroundColor: color || '#9333ea' }} 
                            />
                            <span className="text-xs font-light text-slate-600 dark:text-slate-400">
                                {color?.toUpperCase() || '#9333EA'}
                            </span>
                        </div>
                        <Paintbrush size={14} className="text-slate-400" />
                    </Button>
                }
            />
            <PopoverContent className="w-64 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200 dark:border-slate-700 shadow-xl rounded-xl z-[100]">
                <div className="space-y-4">
                    <div>
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                            {t('actors.palette') || 'Palette'}
                        </Label>
                        <div className="grid grid-cols-5 gap-2">
                            {presets.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => {
                                        onChange(p);
                                        // Keeping it open for easy comparison, user can click outside to close
                                    }}
                                    className={`size-8 rounded-full border-2 transition-all hover:scale-110 active:scale-95 shadow-sm ${
                                        color === p 
                                            ? 'border-white dark:border-white ring-2 ring-blue-500/50 scale-110' 
                                            : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: p }}
                                    title={p}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-slate-800" />

                    <div>
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                            {t('actors.custom') || 'Custom Color'}
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    value={color?.toUpperCase() || '#'}
                                    onChange={(e) => onChange(e.target.value)}
                                    className="h-8 text-[10px] font-mono bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                />
                            </div>
                            <div className="relative w-8 h-8 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                <input
                                    type="color"
                                    value={color || '#9333ea'}
                                    onChange={(e) => onChange(e.target.value)}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                                />
                                <div 
                                    className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 font-bold"
                                    style={{ backgroundColor: color }}
                                >
                                    <Paintbrush size={12} className={parseInt((color || '#000000').replace('#',''), 16) > 0xffffff/2 ? 'text-black/50' : 'text-white/50'} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    </div>
    );
};
