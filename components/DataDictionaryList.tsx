import React, { useState, useMemo, useEffect } from 'react';
import { DataDefinition, DefinitionType } from '../types';
import {
    Delete as DeleteIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Check as CheckIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import SmartSelect from './SmartSelect';
import { useCrossModelData } from '../hooks/useCrossModelData';

interface DataDictionaryListProps {
    definitions: DataDefinition[];
    onAddDefinition: (def: Omit<DataDefinition, 'id'>) => void;
    onUpdateDefinition: (id: string, def: Partial<DataDefinition>) => void;
    onRemoveDefinition: (id: string) => void;
    modelId: string | null;
}

const DataDictionaryList: React.FC<DataDictionaryListProps> = ({
    definitions,
    onAddDefinition,
    onUpdateDefinition,
    onRemoveDefinition,
    modelId
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newEntityName, setNewEntityName] = useState('');
    const [newDef, setNewDef] = useState<Omit<DataDefinition, 'id'>>({
        name: '',
        type: DefinitionType.Entity,
        description: '',
        attributes: []
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDef, setEditDef] = useState<Partial<DataDefinition>>({});
    const [focusTrigger, setFocusTrigger] = useState(0);

    const { crossModelDefinitions } = useCrossModelData(modelId);

    // Refs for auto-focus
    const newAttributeRefs = React.useRef<(HTMLInputElement | null)[]>([]);
    const editAttributeRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (isAdding) {
            setFocusTrigger(prev => prev + 1);
        }
    }, [isAdding]);

    const remoteDefinitionOptions = useMemo(() => {
        const localNames = new Set(definitions.map(d => d.name.toLowerCase()));
        return crossModelDefinitions
            .filter(d => !localNames.has(d.label.toLowerCase()))
            .map(d => ({
                id: d.id,
                label: d.label,
                subLabel: `From ${d.modelName}`,
                group: 'Suggestions',
                originalData: d
            }));
    }, [crossModelDefinitions, definitions]);

    const handleAddDefinition = (idOrName: string, option?: any) => {
        if (option && option.originalData) {
            // Import remote definition
            const remoteDef = option.originalData;
            const data = remoteDef.originalData;
            setNewDef({
                name: remoteDef.label,
                type: data.type || DefinitionType.Entity,
                description: data.description,
                attributes: data.attributes || []
            });
            setNewEntityName(remoteDef.label);
        } else if (idOrName) {
            // Create new definition
            setNewDef(prev => ({ ...prev, name: idOrName }));
            setNewEntityName(idOrName);
        }
    };

    const attributeTypeOptions = useMemo(() => {
        const standardTypes = ['String', 'Number', 'Boolean', 'Date', 'UUID'];
        const entityTypes = definitions.map(d => d.name);
        return [...standardTypes, ...entityTypes];
    }, [definitions]);

    const handleSaveNew = () => {
        if (newDef.name.trim()) {
            onAddDefinition(newDef);
            setIsAdding(false);
            setNewDef({
                name: '',
                type: DefinitionType.Entity,
                description: '',
                attributes: []
            });
            setNewEntityName('');
        }
    };

    const startEditing = (def: DataDefinition) => {
        setEditingId(def.id);
        setEditDef(def);
    };

    const saveEditing = () => {
        if (editingId && editDef.name) {
            onUpdateDefinition(editingId, editDef);
            setEditingId(null);
            setEditDef({});
        }
    };

    // --- Attribute Handlers (New) ---
    const addAttributeNew = () => {
        setNewDef(prev => ({
            ...prev,
            attributes: [...(prev.attributes || []), { name: '', type: 'String' }]
        }));
    };

    const updateAttributeNew = (index: number, field: 'name' | 'type', value: string) => {
        setNewDef(prev => {
            const newAttributes = [...(prev.attributes || [])];
            newAttributes[index] = { ...newAttributes[index], [field]: value };
            return { ...prev, attributes: newAttributes };
        });
    };

    const removeAttributeNew = (index: number) => {
        setNewDef(prev => ({
            ...prev,
            attributes: (prev.attributes || []).filter((_, i) => i !== index)
        }));
    };

    // --- Attribute Handlers (Edit) ---
    const addAttributeEdit = () => {
        setEditDef(prev => ({
            ...prev,
            attributes: [...(prev.attributes || []), { name: '', type: 'String' }]
        }));
    };

    const updateAttributeEdit = (index: number, field: 'name' | 'type', value: string) => {
        setEditDef(prev => {
            const newAttributes = [...(prev.attributes || [])];
            newAttributes[index] = { ...newAttributes[index], [field]: value };
            return { ...prev, attributes: newAttributes };
        });
    };

    const removeAttributeEdit = (index: number) => {
        setEditDef(prev => ({
            ...prev,
            attributes: (prev.attributes || []).filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Data Dictionary</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-600"
                    title="Add Definition"
                >
                    <AddIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Add Form */}
            {isAdding && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                    <SmartSelect
                        options={remoteDefinitionOptions}
                        value={newEntityName}
                        onChange={handleAddDefinition}
                        onCreate={handleAddDefinition}
                        onSearchChange={setNewEntityName}
                        placeholder="Add or import entity..."
                        allowCustomValue={true}
                        focusTrigger={focusTrigger}
                    />

                    <div className="flex gap-2">
                        <select
                            value={newDef.type}
                            onChange={(e) => setNewDef({ ...newDef, type: e.target.value as DefinitionType })}
                            className="block w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            onKeyDown={(e) => e.stopPropagation()}
                        >
                            <option value={DefinitionType.Entity}>Entity</option>
                            <option value={DefinitionType.ValueObject}>Value Object</option>
                            <option value={DefinitionType.Enum}>Enum</option>
                        </select>
                        <input
                            type="text"
                            value={newDef.description || ''}
                            onChange={(e) => setNewDef({ ...newDef, description: e.target.value })}
                            placeholder="Description"
                            className="block w-2/3 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                    </div>

                    {/* Attributes (New) */}
                    <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-500 uppercase">Attributes</div>
                        {newDef.attributes?.map((attr, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <input
                                    ref={el => { newAttributeRefs.current[index] = el; }}
                                    type="text"
                                    value={attr.name}
                                    onChange={(e) => updateAttributeNew(index, 'name', e.target.value)}
                                    placeholder="Name"
                                    className="block w-1/2 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                                    onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') {
                                            addAttributeNew();
                                        }
                                    }}
                                />
                                <input
                                    type="text"
                                    list="attribute-types"
                                    value={attr.type}
                                    onChange={(e) => updateAttributeNew(index, 'type', e.target.value)}
                                    placeholder="Type"
                                    className="block w-1/3 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                                    onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') {
                                            addAttributeNew();
                                        }
                                    }}
                                />
                                <datalist id="attribute-types">
                                    {attributeTypeOptions.map(type => (
                                        <option key={type} value={type} />
                                    ))}
                                </datalist>
                                <button
                                    onClick={() => removeAttributeNew(index)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); addAttributeNew(); }}
                            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                        >
                            <AddIcon className="w-3 h-3 mr-1" /> Add Attribute
                        </button>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveNew}
                            className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="space-y-2">
                {definitions.map(def => (
                    <div key={def.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        {editingId === def.id ? (
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={editDef.name || ''}
                                        onChange={(e) => setEditDef({ ...editDef, name: e.target.value })}
                                        className="block w-1/3 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                                        onKeyDown={(e) => e.stopPropagation()}
                                    />
                                    <select
                                        value={editDef.type}
                                        onChange={(e) => setEditDef({ ...editDef, type: e.target.value as DefinitionType })}
                                        className="block w-1/3 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                        onKeyDown={(e) => e.stopPropagation()}
                                    >
                                        <option value={DefinitionType.Entity}>Entity</option>
                                        <option value={DefinitionType.ValueObject}>Value Object</option>
                                        <option value={DefinitionType.Enum}>Enum</option>
                                    </select>
                                </div>
                                <input
                                    type="text"
                                    value={editDef.description || ''}
                                    onChange={(e) => setEditDef({ ...editDef, description: e.target.value })}
                                    placeholder="Description"
                                    className="block w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                                    onKeyDown={(e) => e.stopPropagation()}
                                />

                                {/* Attributes (Edit) */}
                                <div className="space-y-2">
                                    <div className="text-xs font-medium text-gray-500 uppercase">Attributes</div>
                                    {editDef.attributes?.map((attr, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <input
                                                ref={el => { editAttributeRefs.current[index] = el; }}
                                                type="text"
                                                value={attr.name}
                                                onChange={(e) => updateAttributeEdit(index, 'name', e.target.value)}
                                                placeholder="Name"
                                                className="block w-1/2 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                                                onKeyDown={(e) => {
                                                    e.stopPropagation();
                                                    if (e.key === 'Enter') {
                                                        addAttributeEdit();
                                                    }
                                                }}
                                            />
                                            <input
                                                type="text"
                                                list="attribute-types"
                                                value={attr.type}
                                                onChange={(e) => updateAttributeEdit(index, 'type', e.target.value)}
                                                placeholder="Type"
                                                className="block w-1/3 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md"
                                                onKeyDown={(e) => {
                                                    e.stopPropagation();
                                                    if (e.key === 'Enter') {
                                                        addAttributeEdit();
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => removeAttributeEdit(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <CloseIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); addAttributeEdit(); }}
                                        className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                                    >
                                        <AddIcon className="w-3 h-3 mr-1" /> Add Attribute
                                    </button>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="p-1 text-gray-400 hover:text-gray-600"
                                    >
                                        <CloseIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={saveEditing}
                                        className="p-1 text-green-600 hover:text-green-800"
                                    >
                                        <CheckIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{def.name}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${def.type === DefinitionType.Entity ? 'bg-blue-100 text-blue-800' :
                                                def.type === DefinitionType.ValueObject ? 'bg-green-100 text-green-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {def.type}
                                            </span>
                                        </div>
                                        {def.description && (
                                            <p className="text-sm text-gray-500 mt-1">{def.description}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => startEditing(def)}
                                            className="p-1 text-gray-400 hover:text-indigo-600"
                                        >
                                            <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onRemoveDefinition(def.id)}
                                            className="p-1 text-gray-400 hover:text-red-600"
                                        >
                                            <DeleteIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {def.attributes && def.attributes.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {def.attributes.map((attr, i) => (
                                            <div key={i} className="text-xs text-gray-600 flex justify-between border-b border-gray-100 last:border-0 py-1">
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
            </div>
        </div>
    );
};

export default DataDictionaryList;
