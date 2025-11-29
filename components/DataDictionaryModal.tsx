import React, { useState, useEffect } from 'react';
import { CloseIcon, PlusIcon, DeleteIcon } from './icons';

interface DataDictionaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    definitions: Record<string, any>;
    onAddDefinition: (name: string, definition: any) => void;
    onUpdateDefinition: (name: string, definition: any) => void;
    onDeleteDefinition: (name: string) => void;
}

const DataDictionaryModal: React.FC<DataDictionaryModalProps> = ({
    isOpen,
    onClose,
    definitions,
    onAddDefinition,
    onUpdateDefinition,
    onDeleteDefinition
}) => {
    const [selectedDef, setSelectedDef] = useState<string | null>(null);
    const [newDefName, setNewDefName] = useState('');
    const [jsonContent, setJsonContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');

    useEffect(() => {
        if (selectedDef && definitions[selectedDef]) {
            setJsonContent(JSON.stringify(definitions[selectedDef], null, 2));
        } else {
            setJsonContent('');
        }
    }, [selectedDef, definitions]);

    if (!isOpen) return null;

    const handleAdd = () => {
        if (!newDefName.trim()) return;
        if (definitions[newDefName]) {
            alert('Definition already exists!');
            return;
        }
        onAddDefinition(newDefName, { type: 'object', properties: {} });
        setSelectedDef(newDefName);
        setNewDefName('');
    };

    const handleSaveJson = () => {
        if (!selectedDef) return;
        try {
            const parsed = JSON.parse(jsonContent);
            onUpdateDefinition(selectedDef, parsed);
            setError(null);
        } catch (e) {
            setError('Invalid JSON');
        }
    };

    const handleUpdateField = (key: string, field: any) => {
        if (!selectedDef) return;
        const currentDef = definitions[selectedDef];
        const newProperties = { ...currentDef.properties, [key]: field };
        const newDef = { ...currentDef, properties: newProperties };
        onUpdateDefinition(selectedDef, newDef);
    };

    const handleDeleteField = (key: string) => {
        if (!selectedDef) return;
        const currentDef = definitions[selectedDef];
        const newProperties = { ...currentDef.properties };
        delete newProperties[key];
        const newDef = { ...currentDef, properties: newProperties };
        onUpdateDefinition(selectedDef, newDef);
    };

    const handleAddField = () => {
        if (!selectedDef) return;
        const currentDef = definitions[selectedDef];
        const newKey = `field_${Object.keys(currentDef.properties || {}).length + 1}`;
        const newProperties = { ...currentDef.properties, [newKey]: { type: 'string' } };
        const newDef = { ...currentDef, properties: newProperties };
        onUpdateDefinition(selectedDef, newDef);
    };

    const handleRenameField = (oldKey: string, newKey: string) => {
        if (!selectedDef || !newKey.trim() || oldKey === newKey) return;
        const currentDef = definitions[selectedDef];
        if (currentDef.properties[newKey]) {
            alert('Field name already exists');
            return;
        }
        const newProperties: Record<string, any> = {};
        Object.keys(currentDef.properties).forEach(key => {
            if (key === oldKey) {
                newProperties[newKey] = currentDef.properties[oldKey];
            } else {
                newProperties[key] = currentDef.properties[key];
            }
        });
        const newDef = { ...currentDef, properties: newProperties };
        onUpdateDefinition(selectedDef, newDef);
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="font-bold text-gray-700">Dictionary</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <CloseIcon />
                        </button>
                    </div>

                    <div className="p-4 border-b border-gray-200">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newDefName}
                                onChange={(e) => setNewDefName(e.target.value)}
                                placeholder="New Definition Name"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                            />
                            <button
                                onClick={handleAdd}
                                disabled={!newDefName.trim()}
                                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <PlusIcon />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        {Object.keys(definitions).map(name => (
                            <div
                                key={name}
                                onClick={() => setSelectedDef(name)}
                                className={`flex justify-between items-center p-3 rounded-lg cursor-pointer mb-1 ${selectedDef === name ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'
                                    }`}
                            >
                                <span className="font-medium truncate">{name}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteDefinition(name); }}
                                    className="text-gray-400 hover:text-red-500 p-1"
                                >
                                    <DeleteIcon />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor */}
                <div className="flex-1 flex flex-col bg-white">
                    {selectedDef ? (
                        <>
                            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-gray-800">{selectedDef}</h3>
                                <div className="flex bg-gray-200 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('visual')}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${viewMode === 'visual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        Visual
                                    </button>
                                    <button
                                        onClick={() => setViewMode('json')}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${viewMode === 'json' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        JSON
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 relative overflow-hidden flex flex-col">
                                {viewMode === 'visual' ? (
                                    <div className="flex-1 overflow-y-auto p-6">
                                        <div className="space-y-4">
                                            {Object.entries(definitions[selectedDef]?.properties || {}).map(([key, field]: [string, any]) => (
                                                <div key={key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group hover:border-indigo-300 transition-colors">
                                                    <div className="flex-1 grid grid-cols-12 gap-3">
                                                        <div className="col-span-4">
                                                            <label className="block text-xs font-medium text-gray-500 mb-1">Field Name</label>
                                                            <input
                                                                type="text"
                                                                defaultValue={key}
                                                                onBlur={(e) => handleRenameField(key, e.target.value)}
                                                                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-indigo-500"
                                                            />
                                                        </div>
                                                        <div className="col-span-3">
                                                            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                                                            <select
                                                                value={field.type}
                                                                onChange={(e) => handleUpdateField(key, { ...field, type: e.target.value })}
                                                                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-indigo-500"
                                                            >
                                                                <option value="string">String</option>
                                                                <option value="number">Number</option>
                                                                <option value="boolean">Boolean</option>
                                                                <option value="array">Array</option>
                                                                <option value="object">Object</option>
                                                            </select>
                                                        </div>
                                                        <div className="col-span-4">
                                                            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                                                            <input
                                                                type="text"
                                                                value={field.description || ''}
                                                                onChange={(e) => handleUpdateField(key, { ...field, description: e.target.value })}
                                                                className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-indigo-500"
                                                                placeholder="Optional description"
                                                            />
                                                        </div>
                                                        <div className="col-span-1 flex items-end justify-center pb-1.5">
                                                            <button
                                                                onClick={() => handleDeleteField(key)}
                                                                className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                                                                title="Delete Field"
                                                            >
                                                                <DeleteIcon />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {Object.keys(definitions[selectedDef]?.properties || {}).length === 0 && (
                                                <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                                    No fields defined yet.
                                                </div>
                                            )}

                                            <button
                                                onClick={handleAddField}
                                                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                <PlusIcon />
                                                Add Field
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <textarea
                                            value={jsonContent}
                                            onChange={(e) => setJsonContent(e.target.value)}
                                            className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none"
                                            spellCheck={false}
                                        />
                                        <div className="absolute bottom-4 right-4 flex gap-2">
                                            {error && (
                                                <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200 shadow-lg">
                                                    {error}
                                                </div>
                                            )}
                                            <button
                                                onClick={handleSaveJson}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-lg"
                                            >
                                                Apply Changes
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            Select a definition to edit
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataDictionaryModal;
