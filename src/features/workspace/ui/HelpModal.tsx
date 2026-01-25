import React, { useState } from 'react';
import { ElementType } from '../../modeling';
import { ELEMENT_STYLE } from '../../../shared/constants';
import {
  X,
  Monitor,
  SquareActivity, // Replacing Command
  Zap,
  Eye,
  Globe,
  Settings,
  Upload
} from 'lucide-react';
import { GlassCard } from '../../../shared/components/GlassCard';
import { GlassButton } from '../../../shared/components/GlassButton';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
}

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg">{children}</kbd>
);

const ELEMENT_MAP: Record<ElementType, { name: string; icon: React.ReactNode }> = {
  [ElementType.Screen]: { name: 'Screen', icon: <Monitor size={20} /> },
  [ElementType.Command]: { name: 'Command', icon: <SquareActivity size={20} /> },
  [ElementType.DomainEvent]: { name: 'Domain Event', icon: <Zap size={20} /> },
  [ElementType.ReadModel]: { name: 'Read Model', icon: <Eye size={20} /> },
  [ElementType.IntegrationEvent]: { name: 'Integration Event', icon: <Globe size={20} /> },
  [ElementType.Automation]: { name: 'Automation', icon: <Settings size={20} /> },
};

const IntroductionContent: React.FC<{ onLoadExample: () => void }> = ({ onLoadExample }) => (
  <div className="space-y-6">
    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-500/10 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300">New to Event Modeling?</h3>
        <p className="text-indigo-700 dark:text-indigo-400 text-sm mt-1">
          Load a complete example project to see how Weavr models itself.
        </p>
      </div>
      <button
        onClick={onLoadExample}
        className="shrink-0 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
      >
        <Upload className="w-5 h-5" />
        Load Example Project
      </button>
    </div>

    <p className="text-base text-gray-700 dark:text-gray-300">
      <strong className="font-semibold text-indigo-600 dark:text-indigo-400">Event Modeling</strong> is a visual way to design systems by focusing on how information changes over time. You build a complete "story" of your system with each chapter being a slice or building block told from left to right.
    </p>

    <div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Storage & Privacy</h3>
      <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li>
            <strong>Local-First:</strong> Data is stored exclusively in your browser (IndexedDB). Weavr has no access to it.
          </li>
          <li>
            <strong>Persistence:</strong> Your data remains here as long as you don't clear your browser's "Site Data" or "Cache".
          </li>
          <li>
            <strong>Backups:</strong> To keep your data safe from accidental deletion, use the <strong>Export</strong> button in the top header to save a <code>.json</code> file to your computer.
          </li>
        </ul>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">Core Elements</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {Object.values(ElementType).map(type => (
          <div key={type} className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ backgroundColor: ELEMENT_STYLE[type].color, color: ELEMENT_STYLE[type].textColor }}
            >
              {ELEMENT_MAP[type].icon}
            </div>
            <span className="font-medium text-gray-700 dark:text-gray-300">{ELEMENT_MAP[type].name}</span>
          </div>
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">4 Event Model Patterns</h3>
      <div className="space-y-6">
        <div>
          <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-1">
            State Change Pattern
          </h4>
          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono mb-2 flex items-center flex-wrap gap-1">
            <span className="font-semibold text-gray-800 dark:text-gray-300">Screen</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Command].color }}>Command</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>Domain Event(s)</span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            State Change Pattern describes a state change and its way from the start (what is the trigger?) to the end (what is the state change?). It starts with a white box (Screen), followed by a blue box (Command) and then one or multiple yellow boxes (Event).
          </p>
        </div>

        <div>
          <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-1">
            State View Pattern
          </h4>
          <div className="text-sm text-gray-500 font-mono mb-2 flex items-center flex-wrap gap-1">
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>Domain Event(s)</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE.READ_MODEL.color }}>Read Model (View)</span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            State View Pattern connects existing events from the board to a green “Read Model (View)” box. That leads to a quick overview of what information will be used by it.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-1">
            Automation Pattern
          </h4>
          <div className="text-sm text-gray-500 font-mono mb-2 flex items-center flex-wrap gap-1">
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>Domain Event(s)</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.ReadModel].color }}>Read Model (View)</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Automation].color }}>Automated Trigger</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Command].color }}>Command</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>Domain Event(s)</span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Use this pattern whenever the system should do something automatically. It is essentially a combined State Change and State View Pattern with an automated trigger in the middle.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-1">
            Translation Pattern (System integration)
          </h4>
          <div className="text-sm text-gray-500 font-mono mb-2 flex items-center flex-wrap gap-1">
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.IntegrationEvent].textColor }}>Integration Event(s)</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.ReadModel].color }}>Read Model (View)</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Automation].color }}>Automated Trigger</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Command].color }}>Command</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.IntegrationEvent].textColor }}>Integration Event(s)</span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Used for transferring knowledge from one system into another. Whenever you have to tell another system that something happened, use this pattern.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2 pt-4 border-t border-gray-100 dark:border-gray-800">
        The 4 Anti-Patterns (Overcomplication)
      </h3>
      <div className="space-y-6">
        <div>
          <h4 className="font-bold text-gray-800 dark:text-white mb-1">The Left Chair</h4>
          <div className="text-sm text-gray-500 font-mono mb-2 flex items-center flex-wrap gap-1">
            <span className="font-semibold">Screen</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Command].color }}>Command</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>Event</span> +
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>Event</span> +
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>Event...</span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            One command triggering too many events. This often happens when business logic is crammed into one place instead of being broken down into separate state changes.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-gray-800 dark:text-white mb-1">The Right Chair</h4>
          <div className="text-sm text-gray-500 font-mono mb-2 flex items-center flex-wrap gap-1">
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>Event</span> +
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>Event</span> +
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>Event</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.ReadModel].color }}>Read Model (View</span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Many events feeding into a single read model (View). This indicates a "Summary View" that knows everything, potentially creating high coupling.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-gray-800 dark:text-white mb-1">The Bed</h4>
          <div className="text-sm text-gray-500 font-mono mb-2 flex items-center flex-wrap gap-1">
            <span className="font-semibold">Screen</span> →
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Command].color }}>Command</span> +
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Command].color }}>Command</span> +
            <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Command].color }}>Command</span>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            One UI component firing multiple commands in sequence. This reveals orchestration happening in the front-end instead of letting the event flow handle the sequence.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-gray-800 dark:text-white mb-1">The Bookshelf</h4>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            One slice contains all your business rules and logic (Given-When-Thens), while others are anemic. This is a "God-Object" in visual form where one slice does everything.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const ControlsContent = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Canvas Basics</h3>
      <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
        <li><strong>Pan:</strong> Click and drag the empty canvas background.</li>
        <li><strong>Zoom:</strong> Use your mouse wheel or trackpad scroll.</li>
        <li><strong>Deselect All:</strong> Click once on the empty canvas background.</li>
      </ul>
    </div>

    <div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Working with Elements</h3>
      <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
        <li><strong>Add Element:</strong> Click the <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-500 text-white rounded-full font-bold">+</span> button or press <Kbd>A</Kbd> / <Kbd>N</Kbd>.</li>
        <li><strong>Quick Add:</strong> With toolbar open, press <Kbd>1</Kbd>-<Kbd>6</Kbd> to add specific elements.</li>
        <li><strong>Single Select:</strong> Click any element to select it.</li>
        <li><strong>Multi-Select:</strong> Hold <Kbd>Shift</Kbd> and drag a box around elements.</li>
        <li><strong>Move Single Element:</strong> Click and drag a single element.</li>
        <li><strong>Move Multiple Elements:</strong> Select multiple elements, then drag them with the cursor or use the <Kbd>Arrow Keys</Kbd>.</li>
        <li><strong>Delete:</strong> Select one or more elements and press <Kbd>Delete</Kbd> or <Kbd>Backspace</Kbd>.</li>
        <li><strong>Navigate:</strong> Use <Kbd>Tab</Kbd> and <Kbd>Shift</Kbd>+<Kbd>Tab</Kbd> to cycle through elements.</li>
        <li><strong>Focus Node:</strong> Press <Kbd>F</Kbd> to center the view on the selected element.</li>
        <li><strong>Undo/Redo:</strong> Press <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd> to Undo, <Kbd>Ctrl</Kbd>+<Kbd>Y</Kbd> (or <Kbd>Shift</Kbd>+<Kbd>Z</Kbd>) to Redo.</li>
      </ul>
    </div>

    <div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Properties Panel</h3>
      <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
        <li><strong>Open Panel:</strong> Double-click an element, or select one and press <Kbd>Enter</Kbd>.</li>
        <li><strong>Close Panel:</strong> Press <Kbd>Esc</Kbd> or click the 'X' button.</li>
        <li><strong>Multi-Edit:</strong> Select multiple elements to assign Slices or Entities to all of them at once.</li>
      </ul>
    </div>

    <div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Sidebar Navigation</h3>
      <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
        <li><strong>Open Properties:</strong> Press <Kbd>Alt</Kbd> + <Kbd>P</Kbd>.</li>
        <li><strong>Open Slices:</strong> Press <Kbd>Alt</Kbd> + <Kbd>S</Kbd>.</li>
        <li><strong>Open Dictionary:</strong> Press <Kbd>Alt</Kbd> + <Kbd>D</Kbd>.</li>
      </ul>
    </div>

    <div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Creating Relationships</h3>
      <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
        <li>Hover over an element to see its connection handles.</li>
        <li>Drag a handle from a source element to a target element to create a link.</li>
      </ul>
    </div>
  </div>
);


const TabButton: React.FC<{
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ isActive, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive
      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-slate-800'
      }`}
  >
    {children}
  </button>
);

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<'introduction' | 'controls'>('introduction');

  const handleLoadExample = async () => {
    try {
      const response = await fetch(`/examples/weavr-model.json?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to load example');
      const blob = await response.blob();
      const file = new File([blob], 'Weavr-Self-Model.json', { type: 'application/json' });
      onImport(file);
      onClose();
    } catch (error) {
      console.error('Error loading example:', error);
      alert('Failed to load example project. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/20 dark:bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <GlassCard
        variant="panel"
        className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-md">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Help</h2>
          <GlassButton variant="ghost" size="sm" onClick={onClose} className="rounded-full !p-2">
            <X size={20} />
          </GlassButton>
        </div>

        <div className="p-6 border-b border-gray-200/50 dark:border-white/10 bg-white/10 dark:bg-black/10">
          <div className="flex items-center gap-2">
            <TabButton
              isActive={activeTab === 'introduction'}
              onClick={() => setActiveTab('introduction')}
            >
              Introduction
            </TabButton>
            <TabButton
              isActive={activeTab === 'controls'}
              onClick={() => setActiveTab('controls')}
            >
              Controls & Shortcuts
            </TabButton>
          </div>
        </div>

        <div className="p-6 overflow-y-auto text-slate-700 dark:text-slate-300 custom-scrollbar">
          {activeTab === 'introduction' && <IntroductionContent onLoadExample={handleLoadExample} />}
          {activeTab === 'controls' && <ControlsContent />}
        </div>

        <div className="p-6 mt-auto border-t border-gray-200/50 dark:border-white/10 bg-white/10 dark:bg-black/10 rounded-b-xl text-right">
          <button
            onClick={onClose}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-500/30"
          >
            Got it!
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default HelpModal;