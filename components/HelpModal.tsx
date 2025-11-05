import React from 'react';
import { CloseIcon } from './icons';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">{children}</kbd>
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
          <h2 className="text-2xl font-bold text-gray-800">Welcome to Weavr!</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-200">
            <CloseIcon />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto text-gray-700 space-y-6">
          <p>Here’s a quick guide to the main features and interactions:</p>

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

        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl text-right">
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