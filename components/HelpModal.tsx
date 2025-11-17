import React, { useState } from 'react';
import { ElementType } from '../types';
import { ELEMENT_STYLE } from '../constants';
import { 
  CloseIcon,
  ScreenIcon, 
  CommandIcon, 
  EventInternalIcon, 
  ReadModelIcon, 
  EventExternalIcon, 
  AutomationIcon 
} from './icons';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">{children}</kbd>
);

const ELEMENT_MAP: Record<ElementType, { name: string; icon: React.ReactNode }> = {
  [ElementType.Screen]: { name: 'User Interface', icon: <ScreenIcon /> },
  [ElementType.Command]: { name: 'Command', icon: <CommandIcon /> },
  [ElementType.EventInternal]: { name: 'Internal Event', icon: <EventInternalIcon /> },
  [ElementType.ReadModel]: { name: 'Read Model', icon: <ReadModelIcon /> },
  [ElementType.EventExternal]: { name: 'External Event', icon: <EventExternalIcon /> },
  [ElementType.Automation]: { name: 'Automation', icon: <AutomationIcon /> },
};


const IntroductionContent = () => (
  <div className="space-y-6">
    <p className="text-base">
      <strong className="font-semibold text-indigo-600">Event Modeling</strong> is a visual way to design systems by focusing on how information changes over time. You build a complete "story" of your system from left to right.
    </p>

    <div>
      <h3 className="text-lg font-bold text-gray-800 mb-3">Core Elements</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {Object.values(ElementType).map(type => (
          <div key={type} className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: ELEMENT_STYLE[type].color, color: ELEMENT_STYLE[type].textColor }}
            >
              {ELEMENT_MAP[type].icon}
            </div>
            <span className="font-medium text-gray-700">{ELEMENT_MAP[type].name}</span>
          </div>
        ))}
      </div>
    </div>
    
    <div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">Getting Started (The Workflow)</h3>
      <ol className="list-decimal list-inside space-y-3 text-gray-600">
          <li>
              <strong>Model the Core User Flow:</strong> Start with the user's perspective. An action begins on a <span className="font-semibold text-gray-800">User Interface</span>, which triggers a <span className="font-semibold" style={{color: ELEMENT_STYLE.COMMAND.color}}>Command</span> (the intent). A successful command creates an <span className="font-semibold" style={{color: ELEMENT_STYLE.EVENT_INTERNAL.color}}>Internal Event</span> (the fact). This event then updates a <span className="font-semibold" style={{color: ELEMENT_STYLE.READ_MODEL.color}}>Read Model</span>, providing feedback to the user on a <span className="font-semibold text-gray-800">User Interface</span>.
          </li>
          <li>
              <strong>Add System Reactions:</strong> Does an Event trigger an automatic process? Use an <span className="font-semibold" style={{color: ELEMENT_STYLE.AUTOMATION.color}}>Automation</span> element. It listens for an event and issues a new command.
          </li>
          <li>
              <strong>Integrate External Systems:</strong> When data enters your system from an outside source, use an <span className="font-semibold" style={{color: ELEMENT_STYLE.EVENT_EXTERNAL.textColor}}>External Event</span>. It can either update a Read Model directly or trigger an Automation to translate it into an internal command.
          </li>
      </ol>
    </div>
  </div>
);

const ControlsContent = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">Canvas Basics</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Pan:</strong> Click and drag the empty canvas background.</li>
        <li><strong>Zoom:</strong> Use your mouse wheel or trackpad scroll.</li>
        <li><strong>Deselect All:</strong> Click once on the empty canvas background.</li>
      </ul>
    </div>
    
    <div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">Working with Elements</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Add Element:</strong> Click the <span className="inline-flex items-center justify-center w-6 h-6 bg-indigo-600 text-white rounded-full font-bold">+</span> button or press <Kbd>A</Kbd> / <Kbd>N</Kbd>.</li>
        <li><strong>Single Select:</strong> Click any element to select it.</li>
        <li><strong>Multi-Select:</strong> Hold <Kbd>Shift</Kbd> and drag a box around elements.</li>
        <li><strong>Move Single Element:</strong> Click and drag a single element.</li>
        <li><strong>Move Multiple Elements:</strong> Select multiple elements, then use the <Kbd>Arrow Keys</Kbd>.</li>
        <li><strong>Delete:</strong> Select one or more elements and press <Kbd>Delete</Kbd> or <Kbd>Backspace</Kbd>.</li>
        <li><strong>Navigate:</strong> Use <Kbd>Tab</Kbd> and <Kbd>Shift</Kbd>+<Kbd>Tab</Kbd> to cycle through elements.</li>
      </ul>
    </div>

    <div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">Properties Panel</h3>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Open Panel:</strong> Double-click an element, or select one and press <Kbd>Enter</Kbd>.</li>
        <li><strong>Close Panel:</strong> Press <Kbd>Esc</Kbd> or click the 'X' button.</li>
      </ul>
    </div>

     <div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">Creating Relationships</h3>
      <ul className="list-disc list-inside space-y-1">
          <li>Hover over an element to see its connection handles.</li>
          <li>Drag a handle from a source element to a target element to create a link.</li>
          <li>The canvas provides feedback on valid connections.</li>
      </ul>
    </div>
  </div>
);


const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'introduction' | 'controls'>('introduction');

  if (!isOpen) return null;

  const TabButton: React.FC<{ tabId: 'introduction' | 'controls', children: React.ReactNode }> = ({ tabId, children }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        activeTab === tabId 
        ? 'bg-indigo-100 text-indigo-700' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Help</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-200">
            <CloseIcon />
          </button>
        </div>
        
        <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
                <TabButton tabId="introduction">Introduction</TabButton>
                <TabButton tabId="controls">Controls & Shortcuts</TabButton>
            </div>
        </div>

        <div className="p-6 overflow-y-auto text-gray-700">
          {activeTab === 'introduction' && <IntroductionContent />}
          {activeTab === 'controls' && <ControlsContent />}
        </div>

        <div className="p-6 mt-auto border-t border-gray-200 bg-gray-50 rounded-b-2xl text-right">
            <button
                onClick={onClose}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
                Got it!
            </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;