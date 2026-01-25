import React, { useState, useMemo } from 'react';
import { DataDefinition, DefinitionType } from '../../modeling';
import {
    Trash2,
    ChevronDown,
    Plus,
    X,
    Lock
} from 'lucide-react';
import SmartSelect from '../../../shared/components/SmartSelect';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';
import { useCrossModelData } from '../../modeling';
import { GlassButton } from '../../../shared/components/GlassButton';
import { GlassInput } from '../../../shared/components/GlassInput';

interface DataDictionaryListProps {
    definitions: DataDefinition[];
    onAddDefinition: (def: Omit<DataDefinition, 'id'>) => string;
    onUpdateDefinition: (id: string, def: Partial<DataDefinition>) => void;
    onRemoveDefinition: (id: string) => void;
    modelId: string | null;
}

// Primitives allowed by Weavr Schema
const PRIMITIVE_TYPES = [
    'String', 'Boolean', 'Int', 'Double', 'Decimal', 'Long', 'Date', 'DateTime', 'UUID'
];

const getTypeColor = (type: DefinitionType) => {
    switch (type) {
        case DefinitionType.Entity: return 'bg-blue-500';
        case DefinitionType.ValueObject: return 'bg-green-500';
        case DefinitionType.Enum: return 'bg-amber-500';
        default: return 'bg-gray-400';
    }
};

const DataDictionaryList: React.FC<DataDictionaryListProps> = ({
    definitions,
    onAddDefinition,
    onUpdateDefinition,
    onRemoveDefinition,
    modelId
}) => {
    const { crossModelDefinitions } = useCrossModelData(modelId);

    // State for deleting definitions
    const [deleteDefInfo, setDeleteDefInfo] = useState<{ id: string, anchorEl: HTMLElement } | null>(null);

    // Calculate available types for suggestions (Primitives + Value Objects + Enums)
    const typeSuggestions = useMemo(() => {
        const validDefNames = definitions
            .filter(d => d.type === DefinitionType.ValueObject || d.type === DefinitionType.Enum)
            .map(d => d.name)
            .sort();
        return [...PRIMITIVE_TYPES, ...validDefNames];
    }, [definitions]);

    // Filter suggestions for adding new definitions
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

    const handleAdd = (idOrName: string, option?: any) => {
        let newDefinition: Omit<DataDefinition, 'id'>;

        if (option && option.originalData) {
            // Import remote definition
            const remoteDef = option.originalData;
            const data = remoteDef.originalData;
            newDefinition = {
                name: remoteDef.label,
                type: data.type || DefinitionType.Entity,
                description: data.description,
                attributes: data.attributes || []
            };
        } else if (idOrName) {
            // Create new definition
            newDefinition = {
                name: idOrName,
                type: DefinitionType.Entity,
                description: '',
                attributes: []
            };
        } else {
            return;
        }

        onAddDefinition(newDefinition);
    };

    // Attribute Handlers
    const handleAddAttribute = (def: DataDefinition) => {
        const currentAttributes = def.attributes || [];
        const newAttrs = [...currentAttributes, { name: '', type: 'String' }];
        onUpdateDefinition(def.id, { attributes: newAttrs });
    };

    const handleUpdateAttribute = (def: DataDefinition, index: number, field: 'name' | 'type', value: string) => {
        const currentAttributes = [...(def.attributes || [])];
        if (currentAttributes[index]) {
            currentAttributes[index] = { ...currentAttributes[index], [field]: value };
            onUpdateDefinition(def.id, { attributes: currentAttributes });
        }
    };

    const handleDeleteAttribute = (def: DataDefinition, index: number) => {
        const currentAttributes = [...(def.attributes || [])];
        currentAttributes.splice(index, 1);
        onUpdateDefinition(def.id, { attributes: currentAttributes });
    };

    return (
        <div className="pb-24">
            {/* Add New Definition */}
            <div className="mb-4">
                <SmartSelect
                    options={remoteDefinitionOptions}
                    value=""
                    onChange={(val, opt) => handleAdd(val, opt)}
                    onCreate={(name) => handleAdd(name)}
                    placeholder="Add or import entity..."
                    allowCustomValue={true}
                />
            </div>

            {/* List */}
            <div className="space-y-1">
                {definitions.map((def) => (
                    <details
                        key={def.id}
                        className="group bg-white/5 border border-white/10 rounded-lg overflow-hidden open:bg-white/10 open:border-white/20 transition-all duration-200"
                    >
                        <summary className="flex items-center gap-3 p-3 cursor-pointer list-none hover:bg-white/5 select-none">
                            <ChevronDown className="text-slate-500 group-open:rotate-180 transition-transform duration-200" />
                            <div className={`w-3 h-3 rounded-full ${getTypeColor(def.type)} shadow-sm`} />

                            <span className="font-medium text-slate-800 dark:text-slate-100 flex-1">{def.name}</span>

                            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{def.type}</span>
                        </summary>

                        <div className="p-4 bg-black/5 dark:bg-black/20 border-t border-white/10">
                            {/* Definition Form */}
                            <div className="flex flex-col gap-4 mb-6">
                                <GlassInput
                                    label="Name"
                                    value={def.name || ''}
                                    onChange={(e) => onUpdateDefinition(def.id, { name: e.target.value })}
                                />

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Type</label>
                                    <div className="relative">
                                        <select
                                            value={def.type}
                                            onChange={(e) => onUpdateDefinition(def.id, { type: e.target.value as DefinitionType })}
                                            className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                                        >
                                            <option value={DefinitionType.Entity}>Entity</option>
                                            <option value={DefinitionType.ValueObject}>Value Object</option>
                                            <option value={DefinitionType.Enum}>Enum</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Description</label>
                                    <textarea
                                        value={def.description || ''}
                                        onChange={(e) => onUpdateDefinition(def.id, { description: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-500 min-h-[60px]"
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <GlassButton
                                        variant="danger"
                                        size="sm"
                                        onClick={(e) => setDeleteDefInfo({ id: def.id, anchorEl: e.currentTarget })}
                                    >
                                        <Trash2 size={16} className="mr-1" /> Delete
                                    </GlassButton>
                                </div>
                            </div>

                            <div className="h-px bg-slate-200 dark:bg-white/10 mb-4"></div>

                            {/* Attributes */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attributes</h4>
                                    <GlassButton variant="ghost" size="sm" onClick={() => handleAddAttribute(def)}>
                                        <Plus size={16} className="mr-1" /> Add Attribute
                                    </GlassButton>
                                </div>

                                <div className="space-y-2">
                                    {(Array.isArray(def.attributes) ? def.attributes : []).map((attr, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <GlassInput
                                                placeholder="Name"
                                                value={attr.name}
                                                onChange={(e) => handleUpdateAttribute(def, index, 'name', e.target.value)}
                                                className="!w-full"
                                            />

                                            <div className="relative w-40">
                                                <GlassInput
                                                    placeholder="Type"
                                                    value={attr.type}
                                                    onChange={(e) => handleUpdateAttribute(def, index, 'type', e.target.value)}
                                                    list={`type-suggestions-${def.id}`}
                                                />
                                                <datalist id={`type-suggestions-${def.id}`}>
                                                    {typeSuggestions.map(t => <option key={t} value={t} />)}
                                                </datalist>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    const currentAttributes = [...(def.attributes || [])];
                                                    if (currentAttributes[index]) {
                                                        currentAttributes[index] = { ...currentAttributes[index], isPII: !attr.isPII };
                                                        onUpdateDefinition(def.id, { attributes: currentAttributes });
                                                    }
                                                }}
                                                className={`p-2 rounded-lg transition-colors ${attr.isPII ? 'text-red-500 bg-red-500/10' : 'text-slate-300 hover:text-slate-500'}`}
                                                title={attr.isPII ? "Marked as PII (Sensitive)" : "Mark as PII"}
                                            >
                                                <Lock size={16} />
                                            </button>

                                            <button
                                                onClick={() => handleDeleteAttribute(def, index)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {(def.attributes || []).length === 0 && (
                                        <p className="text-center text-xs text-slate-400 italic py-2">No attributes defined.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </details>
                ))}

                {definitions.length === 0 && (
                    <p className="text-center text-slate-500 pt-8 italic">No definitions created yet.</p>
                )}
            </div>

            {/* Confirm Deletion Menu */}
            <ConfirmMenu
                open={Boolean(deleteDefInfo)}
                anchorEl={deleteDefInfo?.anchorEl || null}
                onClose={() => setDeleteDefInfo(null)}
                onConfirm={() => {
                    if (deleteDefInfo) {
                        onRemoveDefinition(deleteDefInfo.id);
                    }
                }}
                message="Delete this definition?"
            />
        </div>
    );
};

export default DataDictionaryList;
