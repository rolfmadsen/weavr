import React from 'react';
import {
  Plus,
  Monitor,
  Zap,
  Eye,
  Globe,
  Settings,
  SquareActivity
} from 'lucide-react';
import clsx from 'clsx';

interface ToolbarProps {
  onAddNode: (type: any) => void;
  disabled?: boolean;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onAddNode, disabled = false, isMenuOpen, onToggleMenu }) => {
  // Mapping local enum if needed, or importing from modeling. 
  // Assuming these enums match the 'any' or exact type passed.
  const tools = [
    { type: 'SCREEN', label: 'Screen', icon: <Monitor size={24} />, shortcut: '1' },
    { type: 'COMMAND', label: 'Command', icon: <SquareActivity size={24} />, shortcut: '2' },
    { type: 'DOMAIN_EVENT', label: 'Domain Event', icon: <Zap size={24} />, shortcut: '3' },
    { type: 'READ_MODEL', label: 'Read Model', icon: <Eye size={24} />, shortcut: '4' },
    { type: 'INTEGRATION_EVENT', label: 'Integration Event', icon: <Globe size={24} />, shortcut: '5' },
    { type: 'AUTOMATION', label: 'Automation', icon: <Settings size={24} />, shortcut: '6' },
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
                <button
                  onClick={() => handleAddClick(tool.type)}
                  aria-label={`Add ${tool.label}`}
                  className="w-12 h-12 bg-white/40 dark:bg-slate-800/60 hover:bg-white/60 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-white/30 dark:border-white/10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ease-out hover:scale-110 hover:shadow-purple-500/20 active:scale-95 backdrop-blur-md"
                  title={`Add ${tool.label} (Press ${tool.shortcut})`}
                  style={{ transitionDelay: `${index * 30}ms` }}
                >
                  {tool.icon}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* FAB */}
        <button
          onClick={onToggleMenu}
          aria-label={isMenuOpen ? "Close Menu" : "Add Element Menu"}
          disabled={disabled}
          className={clsx(
            "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ease-out border border-white/20 backdrop-blur-md",
            disabled ? 'bg-slate-400/50 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 hover:scale-105 hover:shadow-orange-500/40 active:scale-95 text-white'
          )}
          title={disabled ? 'Connecting...' : (isMenuOpen ? 'Close (Esc)' : 'Add Element (A/N)')}
        >
          <div className={clsx("flex items-center justify-center transform transition-transform duration-300", isMenuOpen && !disabled ? 'rotate-45' : 'rotate-0')}>
            <Plus className="text-3xl md:text-4xl leading-none translate-y-px" size={32} />
          </div>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;