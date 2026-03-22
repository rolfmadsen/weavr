import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Monitor,
  Zap,
  Eye,
  Globe,
  Settings,
  SquareActivity
} from 'lucide-react';
import { Button } from '../../../shared/components/ui/button';
import { cn } from '../../../shared/lib/utils';
import { GlassTooltip } from '../../../shared/components/GlassTooltip';


interface ToolbarProps {
  onAddNode: (type: any) => void;
  disabled?: boolean;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onAddNode, disabled = false, isMenuOpen, onToggleMenu }) => {
  const { t } = useTranslation();
  // Mapping local enum if needed, or importing from modeling. 
  // Assuming these enums match the 'any' or exact type passed.
  const tools = [
    { type: 'SCREEN', label: t('modeling.elements.screen'), icon: <Monitor size={28} />, shortcut: '1' },
    { type: 'COMMAND', label: t('modeling.elements.command'), icon: <SquareActivity size={28} />, shortcut: '2' },
    { type: 'DOMAIN_EVENT', label: t('modeling.elements.domainEvent'), icon: <Zap size={28} />, shortcut: '3' },
    { type: 'READ_MODEL', label: t('modeling.elements.readModel'), icon: <Eye size={28} />, shortcut: '4' },
    { type: 'INTEGRATION_EVENT', label: t('modeling.elements.integrationEvent'), icon: <Globe size={28} />, shortcut: '5' },
    { type: 'AUTOMATION', label: t('modeling.elements.automation'), icon: <Settings size={28} />, shortcut: '6' },
  ];

  const handleAddClick = (type: any) => {
    onAddNode(type);
  };

  return (
    <div className="absolute bottom-8 right-4 md:bottom-12 md:right-8 z-20 flex flex-col items-center gap-4 pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {isMenuOpen && !disabled && (
          <div className="flex flex-col items-end gap-3 bg-white/20 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl rounded-2xl p-4 border border-white/20 dark:border-white/10 animate-in slide-in-from-bottom-5 fade-in duration-200">
            {tools.map((tool, index) => (
              <div key={tool.type} className="flex items-center gap-3 w-full justify-end group">
                <span className="md:flex items-center gap-2 text-sm font-medium bg-slate-800/90 text-white py-1.5 px-3 rounded-lg shadow-lg whitespace-nowrap backdrop-blur-sm">
                  {tool.label}
                  <kbd className="text-xs bg-white/20 rounded px-1.5 py-0.5 border border-white/20 min-w-[20px] text-center">{tool.shortcut}</kbd>
                </span>
                <GlassTooltip content={`${tool.label} (Press ${tool.shortcut})`}>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    onClick={() => handleAddClick(tool.type)}
                    aria-label={`${t('common.add')} ${tool.label}`}
                    className="w-12 h-12 bg-white/40 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-white/30 dark:border-white/10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ease-out hover:scale-110 hover:border-purple-500 hover:text-purple-600 active:scale-95 backdrop-blur-md outline-none p-0"
                    style={{ transitionDelay: `${index * 30}ms` }}
                  >
                    {tool.icon}
                  </Button>
                </GlassTooltip>
              </div>
            ))}
          </div>
        )}
 
        {/* FAB */}
        <GlassTooltip content={disabled ? t('common.connecting') : (isMenuOpen ? t('common.closeEsc') : t('common.addElementShortcut'))}>
          <Button
            onClick={onToggleMenu}
            aria-label={isMenuOpen ? t('common.closeMenu') : t('common.addElementMenu')}
            disabled={disabled}
            variant="glass"
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ease-out border border-white/20 backdrop-blur-md outline-none p-0",
              disabled ? 'bg-slate-400/50 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 hover:scale-105 hover:shadow-orange-500/40 active:scale-95 text-white'
            )}
          >
            <div className={cn("flex items-center justify-center transform transition-transform duration-300 h-full w-full", isMenuOpen && !disabled ? 'rotate-45' : 'rotate-0')}>
              <span className="text-4xl md:text-2xl font-black leading-none select-none translate-y-[-1px]">+</span>
            </div>
          </Button>
        </GlassTooltip>
      </div>
    </div>
  );
};

export default Toolbar;