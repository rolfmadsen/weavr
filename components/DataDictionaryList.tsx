import React, { useState } from 'react';
import { PlusIcon, DeleteIcon, EditIcon } from './icons';

interface DataDefinition {
    id: string;
    name: string;
    description?: string;
    type?: string;
}

interface DataDictionaryListProps {
    definitions: DataDefinition[];
    onAddDefinition: (def: Omit<DataDefinition, 'id'>) => void;
    onUpdateDefinition: (id: string, updates: Partial<DataDefinition>) => void;
    onDeleteDefinition: (id: string) => void;
}

const DataDictionaryList: React.FC<DataDictionaryListProps> = ({
    definitions,
    onAddDefinition,
    onUpdateDefinition,
    onDeleteDefinition
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newDef, setNewDef] = useState({ name: '', description: '', type: 'String' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDef, setEditDef] = useState<Partial<DataDefinition>>({});

    const handleAdd = () => {
        if (newDef.name.trim()) {
            onAddDefinition(newDef);
            setNewDef({ name: '', description: '', type: 'String' });
            setIsAdding(false);
        }
    };

    const startEditing = (def: DataDefinition) => {
        setEditingId(def.id);
        setEditDef(def);
    };

    const saveEdit = () => {
        if (editingId && editDef.name?.trim()) {
            onUpdateDefinition(editingId, editDef);
            setEditingId(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Add New Button */}
            {!isAdding && (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                    <PlusIcon className="text-base" />
                    Add New Entity
                </button>
            )}

            {/* Add Form */}
            {isAdding && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                    <input
                        type="text"
                        placeholder="Name (e.g. UserID)"
                        value={newDef.name}
                        onChange={(e) => setNewDef({ ...newDef, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                    />
                    <input
                        type="text"
                        placeholder="Type (e.g. UUID)"
                        value={newDef.type}
                        onChange={(e) => setNewDef({ ...newDef, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <textarea
                        placeholder="Description..."
                        value={newDef.description}
                        onChange={(e) => setNewDef({ ...newDef, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[60px]"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={!newDef.name.trim()}
                            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                            Add
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="space-y-3">
                {definitions.map((def) => (
                    <div
                        key={def.id}
                        className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-indigo-200 transition-colors group"
                    >
                        {editingId === def.id ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={editDef.name}
                                    onChange={(e) => setEditDef({ ...editDef, name: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                                />
                                <input
                                    type="text"
                                    value={editDef.type}
                                    onChange={(e) => setEditDef({ ...editDef, type: e.target.value })}
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-600"
                                />
                                <textarea
                                    value={editDef.description}
                                    onChange={(e) => setEditDef({ ...editDef, description: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[50px]"
                                />
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 font-mono">ID:</span>
                                    <input
                                        type="text"
                                        readOnly
                                        value={def.id}
                                        className="flex-1 px-2 py-0.5 text-xs bg-gray-50 border border-gray-200 rounded text-gray-500 font-mono select-all"
                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
                                    <button onClick={saveEdit} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">Save</button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-start mb-1">
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900">{def.name}</h4>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{def.type}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEditing(def)} className="p-1 text-gray-400 hover:text-indigo-600">
                                            <EditIcon className="text-base" />
                                        </button>
                                        <button onClick={() => onDeleteDefinition(def.id)} className="p-1 text-gray-400 hover:text-red-600">
                                            <DeleteIcon className="text-base" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">{def.description}</p>
                            </div>
                        )}
                    </div>
                ))}
                {definitions.length === 0 && !isAdding && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No entities yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataDictionaryList;
