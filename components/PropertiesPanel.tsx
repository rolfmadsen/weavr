import React, { useEffect, useRef, useState } from 'react';
import { Node as GraphNode, Link, Slice, ElementType } from '../types';
import { DeleteIcon, PlusIcon, ChevronDownIcon } from './icons';

type SelectedItem = { type: 'node', data: GraphNode } | { type: 'link', data: Link } | { type: 'multi-node', data: GraphNode[] };

interface PropertiesPanelProps {
  selectedItem: SelectedItem | null;
  onUpdateNode: (nodeId: string, key: string, value: any) => void;
  onUpdateLink: (linkId: string, key: string, value: any) => void;
  onDeleteLink: (linkId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  slices?: Slice[];
  onAddSlice?: (title: string) => string | void;
  focusOnRender?: boolean;
  onFocusHandled?: () => void;
  definitions?: { id: string; name: string }[];
  onAddDefinition?: (def: { name: string; type: string }) => string | void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedItem,
  onUpdateNode,
  onUpdateLink,
  onDeleteLink,
  onDeleteNode,
  slices,
  onAddSlice,
  focusOnRender,
  onFocusHandled,
  definitions,
  onAddDefinition
}) => {
  if (!selectedItem) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
        <p className="text-lg font-medium">No Selection</p>
        <p className="text-sm mt-2">Select an element on the canvas to view its properties.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selectedItem.type === 'node' && (
        <NodeEditor
          node={selectedItem.data}
          onUpdate={onUpdateNode}
          onDelete={onDeleteNode}
          slices={slices || []}
          onAddSlice={onAddSlice || (() => { })}
          focusOnRender={focusOnRender}
          onFocusHandled={onFocusHandled}
          definitions={definitions || []}
          onAddDefinition={onAddDefinition || (() => { })}
        />
      )}
      {selectedItem.type === 'link' && (
        <LinkEditor
          link={selectedItem.data}
          onUpdate={onUpdateLink}
          onDelete={onDeleteLink}
        />
      )}
      {selectedItem.type === 'multi-node' && (
        <MultiNodeEditor
          nodes={selectedItem.data}
          onUpdateNode={onUpdateNode}
          onDeleteNode={onDeleteNode}
          slices={slices || []}
          onAddSlice={onAddSlice || (() => { })}
          definitions={definitions || []}
          onAddDefinition={onAddDefinition || (() => { })}
        />
      )}
    </div>
  );
};

// --- Sub-Components ---

const NodeEditor: React.FC<{
  node: GraphNode;
  onUpdate: (id: string, key: string, value: any) => void;
  onDelete: (id: string) => void;
  slices: Slice[];
  onAddSlice: (title: string, order: number) => string | void;
  focusOnRender?: boolean;
  onFocusHandled?: () => void;
  definitions: { id: string; name: string }[];
  onAddDefinition: (def: { name: string; type: string }) => string | void;
}> = ({ node, onUpdate, onDelete, slices, onAddSlice, focusOnRender, onFocusHandled, definitions, onAddDefinition }) => {

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
      onFocusHandled?.();
    }
  }, [node.id, focusOnRender, onFocusHandled]);

  const handleSliceCreate = (label: string) => {
    return onAddSlice(label, slices.length);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          ref={nameInputRef}
          type="text"
          value={node.name || ''}
          onChange={(e) => onUpdate(node.id, 'name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            tabIndex={-1}
            value={node.id}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500 text-xs font-mono"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <input
          type="text"
          readOnly
          tabIndex={-1}
          value={node.type}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500 text-sm font-mono cursor-not-allowed"
          title="Type cannot be changed after creation"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Slice</label>
        <SmartSelect
          options={slices.map(s => ({ id: s.id, label: s.title || 'Untitled', color: s.color }))}
          value={node.sliceId}
          onChange={(id) => onUpdate(node.id, 'sliceId', id)}
          onCreate={handleSliceCreate}
          placeholder="Assign to Slice..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Entities</label>
        <div className="space-y-2">
          {node.entityIds && node.entityIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {node.entityIds.map(entityId => {
                const def = definitions.find(d => d.id === entityId);
                return (
                  <span key={entityId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {def?.name || entityId}
                    <button
                      type="button"
                      onClick={() => {
                        const newEntityIds = node.entityIds?.filter(id => id !== entityId) || [];
                        onUpdate(node.id, 'entityIds', newEntityIds);
                      }}
                      className="ml-1.5 inline-flex items-center justify-center text-indigo-400 hover:text-indigo-600 focus:outline-none"
                    >
                      <span className="sr-only">Remove</span>
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <SmartSelect
            options={definitions.filter(d => !node.entityIds?.includes(d.id)).map(d => ({ id: d.id, label: d.name }))}
            value={undefined}
            onChange={(id) => {
              const currentIds = node.entityIds || [];
              if (!currentIds.includes(id)) {
                onUpdate(node.id, 'entityIds', [...currentIds, id]);
              }
            }}
            onCreate={(name) => { return onAddDefinition({ name, type: 'String' }); }}
            placeholder="Add Entity..."
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={() => onDelete(node.id)}
          className="w-full flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <DeleteIcon className="mr-2 text-base" />
          Delete Node
        </button>
      </div>

      {ELEMENT_DETAILS[node.type as ElementType] && (
        <div className="pt-4 border-t border-gray-200 space-y-3">
          <h4 className="text-sm font-bold text-gray-900">Documentation</h4>

          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Purpose</span>
            <p className="text-sm text-gray-600 mt-1">{ELEMENT_DETAILS[node.type as ElementType].purpose}</p>
          </div>

          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Uses</span>
            <p className="text-sm text-gray-600 mt-1">{ELEMENT_DETAILS[node.type as ElementType].uses}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const ELEMENT_DETAILS: Record<ElementType, { purpose: string; uses: string }> = {
  [ElementType.Screen]: {
    purpose: 'Visualizes how users interact with the system or view information.',
    uses: 'Shows where commands originate (e.g., button clicks) and where read models are displayed. Helps clarify data requirements and user flow.'
  },
  [ElementType.Command]: {
    purpose: 'Represents an intention or instruction for the system to perform an action.',
    uses: 'Triggered by user interaction (via a Screen) or an Automation. A successful command results in one or more Events.'
  },
  [ElementType.EventInternal]: {
    purpose: 'Represents a significant fact that has occurred in the system and resulted in persisted data. Written in the past tense.',
    uses: "Forms the system's history and source of truth. Events are used to build Read Models and can trigger Automations."
  },
  [ElementType.ReadModel]: {
    purpose: "Represents a specific query or view of the system's state, derived from past Events.",
    uses: 'Provides the data needed to populate a User Interface or feed information into an Automation. Defines how data is presented or accessed.'
  },
  [ElementType.EventExternal]: {
    purpose: 'Represents data entering the system from an external source (e.g., another service, API, message queue).',
    uses: 'Can trigger a Translation (which is a type of Automation) or feeds directly into Read Models.'
  },
  [ElementType.Automation]: {
    purpose: 'Represents an automated background process or job (not a direct user action).',
    uses: 'Is triggered by an Event (Internal or External). It queries a Read Model (optional) for data and issues a Command to complete its task. This element represents the "process" in the Automation and Translation patterns.'
  },
};

const LinkEditor: React.FC<{
  link: Link;
  onUpdate: (id: string, key: string, value: any) => void;
  onDelete: (id: string) => void;
}> = ({ link, onUpdate, onDelete }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
        <input
          type="text"
          value={link.label || ''}
          onChange={(e) => onUpdate(link.id, 'label', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            tabIndex={-1}
            value={link.id}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500 text-xs font-mono"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={() => onDelete(link.id)}
          className="w-full flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <DeleteIcon className="mr-2 text-base" />
          Delete Link
        </button>
      </div>
    </div>
  );
};

const MultiNodeEditor: React.FC<{
  nodes: GraphNode[];
  onUpdateNode: (id: string, key: string, value: any) => void;
  onDeleteNode: (id: string) => void;
  slices: Slice[];
  onAddSlice: (title: string, order: number) => string | void;
  definitions: { id: string; name: string }[];
  onAddDefinition: (def: { name: string; type: string }) => string | void;
}> = ({ nodes, onUpdateNode, onDeleteNode, slices, onAddSlice, definitions, onAddDefinition }) => {

  const handleSliceChange = (sliceId: string) => {
    nodes.forEach(node => {
      onUpdateNode(node.id, 'sliceId', sliceId);
    });
  };

  // Collect all unique entity IDs from selected nodes
  const allEntityIds = Array.from(new Set(nodes.flatMap(n => n.entityIds || [])));

  const handleRemoveEntity = (entityId: string) => {
    nodes.forEach(node => {
      if (node.entityIds?.includes(entityId)) {
        const newEntityIds = node.entityIds.filter(id => id !== entityId);
        onUpdateNode(node.id, 'entityIds', newEntityIds);
      }
    });
  };

  const handleAddEntity = (entityId: string) => {
    nodes.forEach(node => {
      const currentIds = node.entityIds || [];
      if (!currentIds.includes(entityId)) {
        onUpdateNode(node.id, 'entityIds', [...currentIds, entityId]);
      }
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Multiple Nodes Selected ({nodes.length})</h3>
      <p className="text-sm text-gray-500">Edit common properties below.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Slice</label>
        <SmartSelect
          options={slices.map(s => ({ id: s.id, label: s.title || 'Untitled', color: s.color }))}
          value={nodes[0]?.sliceId || ''} // Assuming all selected nodes have the same slice or taking the first one
          onChange={handleSliceChange}
          onCreate={(title) => { return onAddSlice(title, slices.length); }}
          placeholder="Assign to Slice..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Assign Entities</label>
        <div className="space-y-2">
          {allEntityIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allEntityIds.map(entityId => {
                const def = definitions.find(d => d.id === entityId);
                return (
                  <span key={entityId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {def?.name || entityId}
                    <button
                      type="button"
                      onClick={() => handleRemoveEntity(entityId)}
                      className="ml-1.5 inline-flex items-center justify-center text-indigo-400 hover:text-indigo-600 focus:outline-none"
                    >
                      <span className="sr-only">Remove</span>
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <SmartSelect
            options={definitions.filter(d => !allEntityIds.includes(d.id)).map(d => ({ id: d.id, label: d.name }))}
            value={undefined}
            onChange={handleAddEntity}
            onCreate={(name) => { return onAddDefinition({ name, type: 'String' }); }}
            placeholder="Add Entity to Selected..."
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={() => nodes.forEach(node => onDeleteNode(node.id))}
          className="w-full flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <DeleteIcon className="mr-2 text-base" />
          Delete Selected Nodes
        </button>
      </div>
    </div>
  );
};

// --- SmartSelect Component ---

interface SmartSelectOption {
  id: string;
  label: string;
  color?: string;
}

interface SmartSelectProps {
  options: SmartSelectOption[];
  value: string | undefined;
  onChange: (id: string) => void;
  onCreate?: (title: string) => string | void;
  placeholder?: string;
}

const SmartSelect: React.FC<SmartSelectProps> = ({ options, value, onChange, onCreate, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(option => option.id === value);

  // Sync search with selected option when closed
  useEffect(() => {
    if (!isOpen) {
      setSearch(selectedOption?.label || '');
    }
  }, [isOpen, selectedOption]);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (option: SmartSelectOption) => {
    onChange(option.id);
    setSearch(option.label);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleCreate = () => {
    if (onCreate && search.trim()) {
      const newId = onCreate(search.trim());
      if (newId) {
        onChange(newId);
        // Search will be updated by the useEffect syncing with selectedOption
      }
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setSelectedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isOpen) {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
        handleSelect(filteredOptions[selectedIndex]);
      } else if (filteredOptions.length > 0) {
        // Auto-select top result if nothing explicitly selected
        handleSelect(filteredOptions[0]);
      } else if (search.trim() && onCreate) {
        handleCreate();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch(selectedOption?.label || '');
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
          placeholder={placeholder || 'Select...'}
          value={isOpen ? search : (selectedOption?.label || '')}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
            setSelectedIndex(-1); // Don't auto-highlight, let user navigate or hit enter for top result
          }}
          onFocus={(e) => e.target.select()}
          onClick={() => {
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <div
          className="absolute inset-y-0 right-0 flex items-center px-2 cursor-pointer"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setSearch(''); // Clear search on arrow click to show all
              inputRef.current?.focus();
            }
          }}
        >
          <ChevronDownIcon className="text-gray-400" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <ul className="max-h-60 overflow-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <li
                  key={option.id}
                  className={`px-3 py-2 cursor-pointer hover:bg-indigo-50 ${index === selectedIndex ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'}`}
                  onMouseDown={() => handleSelect(option)}
                >
                  {option.label}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-gray-500">No options</li>
            )}
            {onCreate && search.trim() && !filteredOptions.some(o => o.label.toLowerCase() === search.toLowerCase()) && (
              <li
                className={`px-3 py-2 cursor-pointer text-indigo-600 hover:bg-indigo-50 flex items-center ${selectedIndex === filteredOptions.length ? 'bg-indigo-100' : ''}`}
                onMouseDown={handleCreate}
              >
                <PlusIcon className="text-base mr-2" />
                Create "{search}"
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;