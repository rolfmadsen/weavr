import React from 'react';
import { ElementType } from '../types';
import { AddIcon, CommandIcon, EventInternalIcon, ReadModelIcon, ScreenIcon, EventExternalIcon, AutomationIcon } from './icons';

interface ToolbarProps {
  onAddNode: (type: ElementType) => void;
  disabled?: boolean;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onAddNode, disabled = false, isMenuOpen, onToggleMenu }) => {
  const tools = [
    { type: ElementType.Screen, label: 'Screen', icon: <ScreenIcon />, shortcut: '1' },
    { type: ElementType.Command, label: 'Command', icon: <CommandIcon />, shortcut: '2' },
    { type: ElementType.EventInternal, label: 'Internal Event', icon: <EventInternalIcon />, shortcut: '3' },
    { type: ElementType.ReadModel, label: 'Read Model', icon: <ReadModelIcon />, shortcut: '4' },
    { type: ElementType.EventExternal, label: 'External Event', icon: <EventExternalIcon />, shortcut: '5' },
    { type: ElementType.Automation, label: 'Automation', icon: <AutomationIcon />, shortcut: '6' },
  ];

  const handleAddClick = (type: ElementType) => {
    onAddNode(type);
  };

  return (
    <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 z-20 flex flex-col items-center gap-4">
      {isMenuOpen && !disabled && (
        <div className="flex flex-col items-center gap-3 bg-white/80 backdrop-blur-sm shadow-lg rounded-full p-2">
          {tools.map((tool, index) => (
            <div key={tool.type} className="flex items-center gap-3 w-full justify-end">
               <span className="hidden md:flex items-center gap-2 text-sm font-medium bg-gray-700 text-white py-1 px-3 rounded-md shadow-sm transition-opacity duration-300">
                {tool.label}
                <kbd className="text-xs bg-gray-600 rounded px-1.5 py-0.5 border border-gray-500">{tool.shortcut}</kbd>
              </span>
              <button
                onClick={() => handleAddClick(tool.type)}
                className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 hover:bg-indigo-200 text-gray-700 rounded-full flex items-center justify-center shadow-md transition-transform duration-300 ease-in-out hover:scale-110"
                title={`Add ${tool.label} (Press ${tool.shortcut})`}
                style={{ transitionDelay: `${index * 30}ms` }}
              >
                {tool.icon}
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={onToggleMenu}
        disabled={disabled}
        className={`w-14 h-14 md:w-16 md:h-16 text-white rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ease-in-out ${
          disabled
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-110'
        }`}
        title={disabled ? 'Connecting...' : (isMenuOpen ? 'Close (Esc)' : 'Add Element (A/N)')}
      >
        <div className={`transform transition-transform duration-300 ${isMenuOpen && !disabled ? 'rotate-45' : 'rotate-0'}`}>
            <AddIcon className="text-3xl md:text-4xl" />
        </div>
      </button>
    </div>
  );
};

export default Toolbar;