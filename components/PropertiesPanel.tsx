import React, { useEffect, useRef } from 'react';
import { Node, Link, ElementType } from '../types';
import { ELEMENT_STYLE } from '../constants';
import { CloseIcon, DeleteIcon } from './icons';

type SelectedItem = { type: 'node', data: Node } | { type: 'link', data: Link };

interface PropertiesPanelProps {
  selectedItem: SelectedItem | null;
  onUpdateNode: (nodeId: string, key: string, value: any) => void;
  onUpdateLink: (linkId: string, key: string, value: any) => void;
  onDeleteLink: (linkId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
  focusOnRender: boolean;
  onFocusHandled: () => void;
}

const formatElementType = (type: ElementType) => {
    return type.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedItem, onUpdateNode, onUpdateLink, onDeleteLink, onDeleteNode, onClose, focusOnRender, onFocusHandled }) => {
  if (!selectedItem) return null;

  return (
    <div 
      className="w-full h-full bg-white/95 backdrop-blur-lg shadow-2xl p-6 flex flex-col text-gray-800 rounded-t-2xl 
                md:rounded-none md:border-l md:border-gray-200"
    >
      {/* Mobile drag handle */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 rounded-full md:hidden" />

      <div className="flex justify-between items-center mb-6 pt-2 md:pt-0">
        <h2 className="text-2xl font-bold" style={{ color: selectedItem.type === 'node' ? ELEMENT_STYLE[selectedItem.data.type].color : '#4f46e5' }}>
          {selectedItem.type === 'node' ? formatElementType(selectedItem.data.type) : 'RELATIONSHIP'}
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-200">
            <CloseIcon />
        </button>
      </div>
      
      <div className="flex-grow overflow-y-auto pr-2">
        {selectedItem.type === 'node' && <NodeEditor node={selectedItem.data} onUpdateNode={onUpdateNode} onDeleteNode={onDeleteNode} focusOnRender={focusOnRender} onFocusHandled={onFocusHandled} />}
        {selectedItem.type === 'link' && <LinkEditor link={selectedItem.data} onUpdateLink={onUpdateLink} onDeleteLink={onDeleteLink} focusOnRender={focusOnRender} onFocusHandled={onFocusHandled} />}
      </div>
    </div>
  );
};

interface EditorProps {
    focusOnRender: boolean;
    onFocusHandled: () => void;
}

const ELEMENT_DESCRIPTIONS: Record<ElementType, { purpose: string, uses: string }> = {
  [ElementType.Screen]: {
    purpose: 'Visualizes how users interact with the system or view information.',
    uses: 'Shows where commands originate (e.g., button clicks) and where read models are displayed. Helps clarify data requirements and user flow.',
  },
  [ElementType.Command]: {
    purpose: 'Represents an intention or instruction for the system to perform an action.',
    uses: 'Triggered by user interaction (via a Screen) or an Automation. A successful command results in one or more Events.',
  },
  [ElementType.EventInternal]: {
    purpose: 'Represents a significant fact that has occurred in the system and resulted in persisted data. Written in the past tense.',
    uses: 'Forms the system\'s history and source of truth. Events are used to build Read Models and can trigger Automations.',
  },
  [ElementType.ReadModel]: {
    purpose: 'Represents a specific query or view of the system\'s state, derived from past Events.',
    uses: 'Provides the data needed to populate Screens or feed information into Automations. Defines how data is presented or accessed.',
  },
  [ElementType.EventExternal]: {
    purpose: 'Represents data entering the system from an external source (e.g., another service, API, message queue).',
    uses: 'Often triggers a Translation pattern to convert external data into internal Commands/Events, or feeds directly into Read Models.',
  },
};

// --- Node Editor Component ---
const NodeEditor: React.FC<{ node: Node; onUpdateNode: (nodeId: string, key: string, value: any) => void; onDeleteNode: (nodeId: string) => void; } & EditorProps> = ({ node, onUpdateNode, onDeleteNode, focusOnRender, onFocusHandled }) => {
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnRender) {
      nameInputRef.current?.focus();
      onFocusHandled();
    }
  }, [focusOnRender, onFocusHandled]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onUpdateNode(node.id, e.target.name, e.target.value);
  };
  
  const details = ELEMENT_DESCRIPTIONS[node.type];

  return (
    <>
      <div className="mb-6 relative">
        <input
          ref={nameInputRef}
          type="text" id="name" name="name" value={node.name}
          onChange={handleInputChange}
          className="w-full bg-gray-100 border-b-2 border-gray-300 rounded-t-lg p-3 pt-6 focus:outline-none focus:border-indigo-500 transition peer"
          placeholder=" " />
        <label htmlFor="name" className="absolute top-1 left-3 text-xs text-gray-500 transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-indigo-600">Name</label>
      </div>
       
      <div className="mb-6 relative">
          <textarea
            id="description" name="description" rows={4} value={node.description || ''}
            onChange={handleInputChange}
            className="w-full bg-gray-100 border-b-2 border-gray-300 rounded-t-lg p-3 pt-6 focus:outline-none focus:border-indigo-500 transition peer"
            placeholder=" " />
          <label htmlFor="description" className="absolute top-1 left-3 text-xs text-gray-500 transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-indigo-600">Description</label>
      </div>

      {details && (
         <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-1">Purpose</h3>
            <p className="text-sm text-gray-600">{details.purpose}</p>
            <h3 className="text-sm font-bold text-gray-700 mt-3 mb-1">Uses</h3>
            <p className="text-sm text-gray-600">{details.uses}</p>
        </div>
      )}

      <div className="mb-4">
          <label className="block text-sm font-medium text-gray-500 mb-1">ID</label>
          <p className="text-xs text-gray-500 bg-gray-100 p-3 rounded-lg font-mono break-all">{node.id}</p>
      </div>
      <div className="mt-8 border-t border-gray-200 pt-6">
        <button 
          onClick={() => onDeleteNode(node.id)}
          className="w-full flex items-center justify-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 font-medium py-3 px-4 rounded-lg transition"
        >
          <DeleteIcon />
          Delete Element
        </button>
      </div>
    </>
  );
};

// --- Link Editor Component ---
const LinkEditor: React.FC<{ link: Link; onUpdateLink: (linkId: string, key: string, value: any) => void; onDeleteLink: (id: string) => void; } & EditorProps> = ({ link, onUpdateLink, onDeleteLink, focusOnRender, onFocusHandled }) => {
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnRender) {
      labelInputRef.current?.focus();
      onFocusHandled();
    }
  }, [focusOnRender, onFocusHandled]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateLink(link.id, e.target.name, e.target.value);
  };

  return (
    <>
      <div className="mb-6 relative">
        <input
          ref={labelInputRef}
          type="text" id="label" name="label" value={link.label}
          onChange={handleInputChange}
          className="w-full bg-gray-100 border-b-2 border-gray-300 rounded-t-lg p-3 pt-6 focus:outline-none focus:border-indigo-500 transition peer"
          placeholder=" " />
        <label htmlFor="label" className="absolute top-1 left-3 text-xs text-gray-500 transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-indigo-600">Label</label>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-500 mb-1">ID</label>
        <p className="text-xs text-gray-500 bg-gray-100 p-3 rounded-lg font-mono break-all">{link.id}</p>
      </div>
      <div className="mt-8 border-t border-gray-200 pt-6">
        <button 
          onClick={() => onDeleteLink(link.id)}
          className="w-full flex items-center justify-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 font-medium py-3 px-4 rounded-lg transition"
        >
          <DeleteIcon />
          Delete Relationship
        </button>
      </div>
    </>
  );
};

export default PropertiesPanel;