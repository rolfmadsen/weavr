import React, { useState, useMemo } from 'react';
import { PlusIcon, DeleteIcon, EditIcon } from './icons';
import SmartSelect from './SmartSelect';
import { useCrossModelData } from '../hooks/useCrossModelData';
import { DataDefinition, DefinitionType, Attribute, Slice } from '../types';

interface DataDictionaryListProps {
    definitions: DataDefinition[];
    slices: Slice[];
    onAddDefinition: (def: Omit<DataDefinition, 'id'>) => void;
    onUpdateDefinition: (id: string, updates: Partial<DataDefinition>) => void;
    onDeleteDefinition: (id: string) => void;
    modelId: string | null;
}

const DataDictionaryList: React.FC<DataDictionaryListProps> = ({
    definitions,
    slices,
    onAddDefinition,
    onUpdateDefinition,
    onDeleteDefinition,
    modelId
}) => {
    const [isAdding, setIsAdding] = useState(true);

    const [newDef, setNewDef] = useState<Omit<DataDefinition, 'id'>>({
        name: '',
        description: '',
        type: DefinitionType.Entity,
        attributes: []
    });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDef, setEditDef] = useState<Partial<DataDefinition>>({});

    const { crossModelDefinitions, isLoading } = useCrossModelData(modelId);

    // Refs for auto-focus
    const newAttributeRefs = React.useRef<(HTMLInputElement | null)[]>([]);
    const editAttributeRefs = React.useRef<(HTMLInputElement | null)[]>([]);
    const prevNewAttributesLength = React.useRef(0);
    const prevEditAttributesLength = React.useRef(0);

    React.useEffect(() => {
        setIsAdding(true);
    }, []);

    // Auto-focus new attribute in "Add" mode
    React.useEffect(() => {
        const currentLength = newDef.attributes?.length || 0;
        if (currentLength > prevNewAttributesLength.current) {
            const lastIndex = currentLength - 1;
            newAttributeRefs.current[lastIndex]?.focus();
        }
        prevNewAttributesLength.current = currentLength;
    }, [newDef.attributes?.length]);

    // Auto-focus new attribute in "Edit" mode
    React.useEffect(() => {
        const currentLength = editDef.attributes?.length || 0;
        if (currentLength > prevEditAttributesLength.current) {
            const lastIndex = currentLength - 1;
            editAttributeRefs.current[lastIndex]?.focus();
        }
        prevEditAttributesLength.current = currentLength;
    }, [editDef.attributes?.length]);


    const [focusTrigger, setFocusTrigger] = useState(0);

    const handleAdd = () => {
        if (newDef.name.trim()) {
            const normalizedName = newDef.name.trim().toLowerCase();
            if (definitions.some(d => d.name.toLowerCase() === normalizedName)) {
                alert('Entity with this name already exists.');
                return;
            }
            if (slices.some(s => s.title?.toLowerCase() === normalizedName)) {
                alert('A Slice with this name already exists. Names must be unique across Slices and Entities.');
                return;
            }
            onAddDefinition(newDef);
            setNewDef({ name: '', description: '', type: DefinitionType.Entity, attributes: [] });
            setFocusTrigger(prev => prev + 1); // Trigger re-focus
        }
    };

    const startEditing = (def: DataDefinition) => {
        setEditingId(def.id);
        setEditDef(JSON.parse(JSON.stringify(def))); // Deep copy to avoid mutating state directly
        prevEditAttributesLength.current = def.attributes?.length || 0;
    };

    const saveEdit = () => {
        if (editingId && editDef.name?.trim()) {
            onUpdateDefinition(editingId, editDef);
            setEditingId(null);
        }
    };

    const options = useMemo(() => {
        const currentNames = new Set(definitions.map(d => d.name.toLowerCase()));
        return crossModelDefinitions
            .filter(d => !currentNames.has(d.label.toLowerCase()))
            .map(d => ({
                id: d.id,
                label: d.label,
                subLabel: `From ${d.modelName}`,
                group: 'Suggestions',
                originalData: d.originalData
            }));
    }, [crossModelDefinitions, definitions]);

    const handleSelectSuggestion = (_id: string, option: any) => {
        if (option) {
            // Check if this definition already exists in the current model
            const existingDef = definitions.find(d => d.name.toLowerCase() === option.label.toLowerCase());
            if (existingDef) {
                // If it exists, switch to edit mode
                startEditing(existingDef);
                setIsAdding(false); // Hide add form
            } else {
                // Otherwise, populate the add form (import/copy behavior)
                const data = option.originalData;
                setNewDef({
                    name: option.label,
                    type: (data.type as DefinitionType) || DefinitionType.Entity,
                    description: data.description || '',
                    attributes: data.attributes ? (typeof data.attributes === 'string' ? JSON.parse(data.attributes) : data.attributes) : []
                });
            }
        }
    };

    // Helper to manage attributes in new/edit forms
    const addAttributeNew = () => {
        setNewDef(prev => ({
            ...prev,
            attributes: [...(prev.attributes || []), { name: '', type: 'String' }]
        }));
    };

    const updateAttributeNew = (index: number, field: keyof Attribute, value: string) => {
        setNewDef(prev => {
            const currentAttributes = [...(prev.attributes || [])];
            currentAttributes[index] = { ...currentAttributes[index], [field]: value };
            return { ...prev, attributes: currentAttributes };
        });
    };

    const removeAttributeNew = (index: number) => {
        setNewDef(prev => {
            const currentAttributes = [...(prev.attributes || [])];
            currentAttributes.splice(index, 1);
            return { ...prev, attributes: currentAttributes };
        });
    };

    const addAttributeEdit = () => {
        setEditDef(prev => ({
            ...prev,
            attributes: [...(prev.attributes || []), { name: '', type: 'String' }]
        }));
    };

    const updateAttributeEdit = (index: number, field: keyof Attribute, value: string) => {
        setEditDef(prev => {
            const currentAttributes = [...(prev.attributes || [])];
            currentAttributes[index] = { ...currentAttributes[index], [field]: value };
            return { ...prev, attributes: currentAttributes };
        });
    };

    const removeAttributeEdit = (index: number) => {
        setEditDef(prev => {
            const currentAttributes = [...(prev.attributes || [])];
            currentAttributes.splice(index, 1);
            return { ...prev, attributes: currentAttributes };
        });
    };

    const attributeTypeOptions = useMemo(() => {
        const standardTypes = ['String', 'Number', 'Boolean', 'Date', 'UUID'];
        const entityTypes = definitions.map(d => d.name);
        return [...standardTypes, ...entityTypes].sort();
    }, [definitions]);

    return (
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
            <datalist id="attribute-types">
                {attributeTypeOptions.map(type => (
                    <option key={type} value={type} />
                ))}
            </datalist>

            {/* Add Form */}
            {isAdding ? (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                    <SmartSelect
                        options={options}
                        value={newDef.name}
                        onChange={handleSelectSuggestion}
                        onCreate={(name) => {
                            setNewDef({ ...newDef, name });
                        }}
                        onSearchChange={(name) => {
                            setNewDef({ ...newDef, name });
                        }}
                        placeholder={isLoading ? "Loading suggestions..." : "Name (e.g. User)"}
                        autoFocus={true}
                        allowCustomValue={true}
                        focusTrigger={focusTrigger}
                    />

                    <div className="flex gap-2">
                        <select
                            value={newDef.type}
                            onChange={(e) => setNewDef({ ...newDef, type: e.target.value as DefinitionType })}
                            className="w-1/3 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            onKeyDown={(e) => { if (!e.altKey && e.key !== 'Tab') e.stopPropagation(); }}
                        >
                            {Object.values(DefinitionType).sort().map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="Description..."
                            value={newDef.description}
                            onChange={(e) => setNewDef({ ...newDef, description: e.target.value })}
                            className="w-2/3 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            onKeyDown={(e) => { if (!e.altKey && e.key !== 'Tab') e.stopPropagation(); }}
                        />
                    </div>

                    {/* Attributes Section */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Attributes</label>
                            <button
                                onClick={addAttributeNew}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        addAttributeNew();
                                    }
                                }}
                            >+ Add Attribute</button>
                        </div>
                        {newDef.attributes?.map((attr, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <input
                                    ref={el => { newAttributeRefs.current[idx] = el; }}
                                    type="text"
                                    placeholder="Name"
                                    value={attr.name}
                                    onChange={(e) => updateAttributeNew(idx, 'name', e.target.value)}
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    onKeyDown={(e) => {
                                        if (!e.altKey && e.key !== 'Tab') e.stopPropagation();
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addAttributeNew();
                                        }
                                    }}
                                />
                                <input
                                    type="text"
                                    list="attribute-types"
                                    placeholder="Type"
                                    value={attr.type}
                                    onChange={(e) => updateAttributeNew(idx, 'type', e.target.value)}
                                    className="w-1/3 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    onKeyDown={(e) => {
                                        if (!e.altKey && e.key !== 'Tab') e.stopPropagation();
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addAttributeNew();
                                        }
                                    }}
                                />
                                <button onClick={() => removeAttributeNew(idx)} className="text-gray-400 hover:text-red-500">
                                    <DeleteIcon className="text-sm" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAdd();
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAdd();
                                }
                            }}
                            disabled={!newDef.name.trim()}
                            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                            Add
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                    <PlusIcon className="text-base" />
                    Add New Entity
                </button>
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
                                    onKeyDown={(e) => { if (!e.altKey && e.key !== 'Tab') e.stopPropagation(); }}
                                />
                                <div className="flex gap-2">
                                    <select
                                        value={editDef.type}
                                        onChange={(e) => setEditDef({ ...editDef, type: e.target.value as DefinitionType })}
                                        className="w-1/3 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                        onKeyDown={(e) => { if (!e.altKey && e.key !== 'Tab') e.stopPropagation(); }}
                                    >
                                        {Object.values(DefinitionType).sort().map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        value={editDef.description}
                                        onChange={(e) => setEditDef({ ...editDef, description: e.target.value })}
                                        className="w-2/3 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        placeholder="Description"
                                        onKeyDown={(e) => { if (!e.altKey && e.key !== 'Tab') e.stopPropagation(); }}
                                    />
                                </div>

                                {/* Edit Attributes */}
                                <div className="space-y-2 bg-gray-50 p-2 rounded">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Attributes</label>
                                        <button
                                            onClick={addAttributeEdit}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    addAttributeEdit();
                                                }
                                            }}
                                        >+ Add</button>
                                    </div>
                                    {editDef.attributes?.map((attr, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <input
                                                ref={el => { editAttributeRefs.current[idx] = el; }}
                                                type="text"
                                                value={attr.name}
                                                onChange={(e) => updateAttributeEdit(idx, 'name', e.target.value)}
                                                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                placeholder="Name"
                                                onKeyDown={(e) => {
                                                    if (!e.altKey && e.key !== 'Tab') e.stopPropagation();
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addAttributeEdit();
                                                    }
                                                }}
                                            />
                                            <input
                                                type="text"
                                                list="attribute-types"
                                                value={attr.type}
                                                onChange={(e) => updateAttributeEdit(idx, 'type', e.target.value)}
                                                className="w-1/3 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                placeholder="Type"
                                                onKeyDown={(e) => {
                                                    if (!e.altKey && e.key !== 'Tab') e.stopPropagation();
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addAttributeEdit();
                                                    }
                                                }}
                                            />
                                            <button onClick={() => removeAttributeEdit(idx)} className="text-gray-400 hover:text-red-500">
                                                <DeleteIcon className="text-xs" />
                                            </button>
                                        </div>
                                    ))}
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
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${def.type === DefinitionType.Entity ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                                            {def.type}
                                        </span>
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
                                {def.description && <p className="text-sm text-gray-600 mb-2">{def.description}</p>}

                                {def.attributes && def.attributes.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {def.attributes.map((attr, i) => (
                                            <div key={i} className="flex justify-between text-xs text-gray-500 border-b border-gray-100 last:border-0 py-0.5">
                                                <span>{attr.name}</span>
                                                <span className="font-mono text-gray-400">{attr.type}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
