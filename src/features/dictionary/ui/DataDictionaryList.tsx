import React, { useState, useMemo, useEffect } from 'react';
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
    orphanedFields?: { name: string, type: string, nodeIds: string[] }[];
    onLinkFieldToDefinition?: (fieldName: string, fieldType: string, definitionId: string) => void;
}

// Primitives allowed by Weavr Schema
const PRIMITIVE_TYPES = [
    'String', 'Boolean', 'Int', 'Double', 'Decimal', 'Long', 'Date', 'DateTime', 'UUID'
];

const getTypeColor = (type: DefinitionType) => {
    switch (type) {
        case DefinitionType.Aggregate: return 'bg-emerald-500';
        case DefinitionType.Entity: return 'bg-blue-500';
        case DefinitionType.ValueObject: return 'bg-purple-500';
        case DefinitionType.Enum: return 'bg-amber-500';
        default: return 'bg-gray-400';
    }
};

// Helper for optimizing updates/analytics
const DebouncedInput: React.FC<any> = ({ value, onCommit, ...props }) => {
    const [localValue, setLocalValue] = useState(value);
    useEffect(() => setLocalValue(value), [value]);

    return (
        <GlassInput
            {...props}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => {
                if (localValue !== value) onCommit(localValue);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.currentTarget.blur();
                }
            }}
        />
    );
};

const DebouncedTextarea: React.FC<any> = ({ value, onCommit, className, ...props }) => {
    const [localValue, setLocalValue] = useState(value);
    useEffect(() => setLocalValue(value), [value]);

    return (
        <textarea
            {...props}
            className={className}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={() => {
                if (localValue !== value) onCommit(localValue);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.currentTarget.blur();
                }
            }}
        />
    );
};

const DataDictionaryList: React.FC<DataDictionaryListProps> = ({
    definitions,
    onAddDefinition,
    onUpdateDefinition,
    onRemoveDefinition,
    modelId,
    orphanedFields = [],
    onLinkFieldToDefinition
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

    // Aggregate Options for Parent selection
    const aggregateOptions = useMemo(() => {
        const list = definitions
            .filter(d => d.type === DefinitionType.Aggregate)
            .map(d => ({
                id: d.id,
                label: d.name,
                group: 'Aggregates'
            }));

        return [
            { id: '__none__', label: 'None', group: 'System' },
            ...list
        ];
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
        console.log('[DataDictionary] handleAdd triggered:', { idOrName, option });
        let newDefinition: Omit<DataDefinition, 'id'> & { id?: string };

        if (option && option.originalData) {
            // Import remote definition
            console.log('[DataDictionary] Importing remote definition...');
            const remoteDef = option.originalData;
            const data = remoteDef.originalData;

            // Handle Gun serialization (attributes might be a JSON string)
            console.log('[DataDictionary] Import data raw:', data);
            let parsedAttributes = data.attributes || [];
            if (typeof parsedAttributes === 'string') {
                try {
                    parsedAttributes = JSON.parse(parsedAttributes);
                } catch (e) {
                    console.error('[DataDictionary] Failed to parse attributes:', e);
                    parsedAttributes = [];
                }
            }

            newDefinition = {
                id: remoteDef.id, // Keep the same ID if possible
                name: remoteDef.label,
                type: data.type || DefinitionType.Entity,
                description: data.description,
                attributes: parsedAttributes
            };
            const id = onAddDefinition(newDefinition);
            console.log('[DataDictionary] Remote definition added with ID:', id);
            return id;
        } else if (idOrName && !option) {
            // Create new definition
            console.log(`[DataDictionary] Creating new definition: ${idOrName} `);
            newDefinition = {
                name: idOrName,
                type: DefinitionType.Entity,
                description: '',
                attributes: []
            };
            const id = onAddDefinition(newDefinition);
            console.log('[DataDictionary] New definition added with ID:', id);
            return id;
        } else {
            console.log('[DataDictionary] Selection only or empty input, ignoring.');
            return '';
        }
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
            {/* Unassigned Attributes (Orphaned Fields) */}
            {orphanedFields.length > 0 && (
                <div className="mb-8 p-4 bg-purple-500/5 rounded-xl border border-purple-500/20">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">Unassigned Attributes</h3>
                            <span className="bg-purple-500/20 text-purple-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {orphanedFields.length}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {orphanedFields.map((field, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 dark:bg-black/20 rounded-lg border border-white/10 group">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{field.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{field.type}</span>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => {
                                            const newId = onAddDefinition({
                                                name: field.name,
                                                type: DefinitionType.Entity,
                                                attributes: [{ name: field.name, type: field.type }]
                                            });
                                            if (onLinkFieldToDefinition) {
                                                onLinkFieldToDefinition(field.name, field.type, newId);
                                            }
                                        }}
                                        className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white px-2 py-1 rounded border border-emerald-500/20 transition-all font-bold uppercase"
                                    >
                                        To Entity
                                    </button>
                                    <div className="relative group/menu">
                                        <button className="text-[10px] bg-purple-500/10 hover:bg-purple-500 text-purple-600 hover:text-white px-2 py-1 rounded border border-purple-500/20 transition-all font-bold uppercase">
                                            Link To...
                                        </button>
                                        <div className="absolute right-0 bottom-full mb-1 hidden group-hover/menu:block z-[110] min-w-[140px]">
                                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg shadow-xl p-1 max-h-48 overflow-y-auto custom-scrollbar">
                                                {definitions.filter(d => d.type !== DefinitionType.Aggregate).map(def => (
                                                    <button
                                                        key={def.id}
                                                        onClick={() => onLinkFieldToDefinition?.(field.name, field.type, def.id)}
                                                        className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-purple-500/10 rounded transition-colors text-slate-700 dark:text-slate-200 truncate"
                                                    >
                                                        {def.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add New Definition */}
            <div className="mb-4">
                <SmartSelect
                    options={remoteDefinitionOptions}
                    value=""
                    onChange={(val, opt) => handleAdd(val, opt)}
                    onCreate={(name) => handleAdd(name)}
                    placeholder="Add or import entity/aggregate..."
                    allowCustomValue={true}
                    autoFocus={true}
                />
            </div>

            {/* List */}
            <div className="space-y-1">
                {definitions.map((def) => {
                    const parent = definitions.find(d => d.id === def.parentId);

                    return (
                        <details
                            key={def.id}
                            className={`group bg-white/5 border border-white/10 rounded-lg overflow-hidden open:bg-white/10 open:border-white/20 transition-all duration-200 ${def.parentId ? 'ml-6' : ''}`}
                        >
                            <summary className="flex items-center gap-3 p-3 cursor-pointer list-none hover:bg-white/5 select-none text-sm">
                                <ChevronDown className="text-slate-500 group-open:rotate-180 transition-transform duration-200" size={16} />
                                <div className={`w-2.5 h-2.5 rounded-full ${getTypeColor(def.type)} ${def.isRoot ? 'ring-2 ring-emerald-500/50' : ''} shadow-sm`} />

                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-800 dark:text-slate-100">{def.name}</span>
                                        {def.isRoot && (
                                            <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-tighter">Root</span>
                                        )}
                                    </div>
                                    {parent && <span className="text-[10px] text-slate-500 opacity-60">Part of {parent.name}</span>}
                                </div>

                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{def.type}</span>
                            </summary>

                            <div className="p-4 bg-black/5 dark:bg-black/20 border-t border-white/10">
                                {/* Aggregate Members Section (Only for Aggregates) */}
                                {def.type === DefinitionType.Aggregate && (
                                    <div className="mb-6">
                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Aggregate Members</h4>
                                        <div className="space-y-1">
                                            {definitions.filter(d => d.parentId === def.id).map(member => (
                                                <div key={member.id} className="flex items-center gap-2 p-2 bg-white/5 rounded border border-white/5 text-xs">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${getTypeColor(member.type)}`} />
                                                    <span className="flex-1 font-medium">{member.name}</span>
                                                    {member.isRoot ? (
                                                        <span className="text-[9px] text-emerald-500 font-bold">ROOT</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                // Unset previous roots for this parent
                                                                definitions.filter(d => d.parentId === def.id && d.isRoot).forEach(r => {
                                                                    onUpdateDefinition(r.id, { isRoot: false });
                                                                });
                                                                // Set this one
                                                                onUpdateDefinition(member.id, { isRoot: true });
                                                            }}
                                                            className="text-[9px] text-slate-500 hover:text-emerald-500 transition-colors uppercase font-bold"
                                                        >
                                                            Make Root
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {definitions.filter(d => d.parentId === def.id).length === 0 && (
                                                <div className="text-[10px] text-slate-500 italic p-2 border border-dashed border-white/10 rounded">
                                                    No members linked yet. Link Entities/VOs to this aggregate to see them here.
                                                </div>
                                            )}
                                        </div>
                                        <div className="h-px bg-slate-200 dark:bg-white/10 mt-6"></div>
                                    </div>
                                )}

                                {/* Definition Form */}
                                <div className="flex flex-col gap-4 mb-6">
                                    <DebouncedInput
                                        label="Name"
                                        value={def.name || ''}
                                        onCommit={(val: string) => onUpdateDefinition(def.id, { name: val })}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Type</label>
                                            <div className="relative">
                                                <select
                                                    value={def.type}
                                                    onChange={(e) => onUpdateDefinition(def.id, { type: e.target.value as DefinitionType })}
                                                    className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                                                >
                                                    <option value={DefinitionType.Aggregate}>Aggregate</option>
                                                    <option value={DefinitionType.Entity}>Entity</option>
                                                    <option value={DefinitionType.ValueObject}>Value Object</option>
                                                    <option value={DefinitionType.Enum}>Enum</option>
                                                </select>
                                            </div>
                                        </div>

                                        {def.type !== DefinitionType.Aggregate && (
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Parent Aggregate</label>
                                                <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <SmartSelect
                                                            options={aggregateOptions}
                                                            value={def.parentId || '__none__'}
                                                            onChange={(id) => {
                                                                const newParentId = (id === '__none__' || !id) ? undefined : id;
                                                                onUpdateDefinition(def.id, {
                                                                    parentId: newParentId,
                                                                    isRoot: newParentId ? def.isRoot : false // Clear root if unlinking
                                                                });
                                                            }}
                                                            placeholder="None"
                                                            allowCustomValue={false}
                                                        />
                                                    </div>
                                                    {def.parentId && (
                                                        <button
                                                            onClick={() => {
                                                                if (!def.isRoot) {
                                                                    // Unset others
                                                                    definitions.filter(d => d.parentId === def.parentId && d.isRoot).forEach(r => {
                                                                        onUpdateDefinition(r.id, { isRoot: false });
                                                                    });
                                                                }
                                                                onUpdateDefinition(def.id, { isRoot: !def.isRoot });
                                                            }}
                                                            className={`px-3 rounded-xl border text-[10px] font-bold transition-all ${def.isRoot ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-white/10 text-slate-500 hover:border-emerald-500/50'}`}
                                                        >
                                                            ROOT
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Description</label>
                                        <DebouncedTextarea
                                            value={def.description || ''}
                                            onCommit={(val: string) => onUpdateDefinition(def.id, { description: val })}
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
                                                <DebouncedInput
                                                    placeholder="Name"
                                                    value={attr.name}
                                                    onCommit={(val: string) => handleUpdateAttribute(def, index, 'name', val)}
                                                    className="!w-full"
                                                />

                                                <div className="relative w-40">
                                                    <DebouncedInput
                                                        placeholder="Type"
                                                        value={attr.type}
                                                        onCommit={(val: string) => handleUpdateAttribute(def, index, 'type', val)}
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
                    );
                })}

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
