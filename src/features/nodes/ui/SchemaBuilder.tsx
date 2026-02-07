import React, { useState, useMemo } from 'react';
import { Plus, X, Import, CheckSquare, Square, Link2 } from 'lucide-react';
import { Node, Field, DataDefinition, DefinitionType } from '../../modeling/domain/types';
import { GlassButton } from '../../../shared/components/GlassButton';
import { GlassTooltip } from '../../../shared/components/GlassTooltip';

import { CrossModelItem } from '../../modeling/store/useCrossModelData';

interface SchemaBuilderProps {
    node: Node;
    onUpdateNode: <K extends keyof Node>(id: string, key: K, value: Node[K]) => void;
    definitions: DataDefinition[];
    crossModelDefinitions?: CrossModelItem[];
    onAddDefinition?: (def: Omit<DataDefinition, 'id'>) => string;
}

// Primitives allowed by Weavr Schema
const PRIMITIVE_TYPES = [
    'String', 'Boolean', 'Int', 'Double', 'Decimal', 'Long', 'Date', 'DateTime', 'UUID'
];

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({
    node,
    onUpdateNode,
    definitions,
    crossModelDefinitions = [],
    onAddDefinition
}) => {
    const fields = node.fields || [];
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [selectedDefinitionId, setSelectedDefinitionId] = useState<string>('');
    const [selectedAttributes, setSelectedAttributes] = useState<Set<string>>(new Set());

    const handleAddField = () => {
        const newField: Field = {
            name: 'newField',
            type: 'String',
            required: true
        };
        onUpdateNode(node.id, 'fields', [...fields, newField]);
    };

    const handleUpdateField = (index: number, changes: Partial<Field>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...changes };
        onUpdateNode(node.id, 'fields', newFields);
    };

    const handleRemoveField = (index: number) => {
        const newFields = fields.filter((_, i) => i !== index);
        onUpdateNode(node.id, 'fields', newFields);
    };

    // Import Logic
    const availableDefinitions = useMemo(() => {
        const localList = definitions.filter(d =>
            d.type === DefinitionType.Entity ||
            d.type === DefinitionType.Aggregate ||
            d.type === DefinitionType.ValueObject
        );

        const remoteList = crossModelDefinitions
            .filter(d => {
                const type = (d.originalData as any)?.type;
                return type === DefinitionType.Entity || type === DefinitionType.Aggregate || type === DefinitionType.ValueObject;
            })
            .map(d => ({
                id: `remote:${d.id}`,
                name: d.label,
                type: (d.originalData as any)?.type,
                parentId: undefined, // remote
                isRoot: (d.originalData as any)?.isRoot,
                isRemote: true,
                modelName: d.modelName,
                originalData: d.originalData
            }));

        const combined = [
            ...localList.map(d => ({ ...d, isRemote: false })),
            ...remoteList
        ];

        return combined.sort((a, b) => {
            // Prioritize members of the current node's aggregate
            const aIsMember = a.parentId === node.aggregate;
            const bIsMember = b.parentId === node.aggregate;
            if (aIsMember && !bIsMember) return -1;
            if (!aIsMember && bIsMember) return 1;

            return a.name.localeCompare(b.name);
        });
    }, [definitions, crossModelDefinitions, node.aggregate]);

    const selectedDef = useMemo(() => {
        if (!selectedDefinitionId) return null;
        if (selectedDefinitionId.startsWith('remote:')) {
            const remote = availableDefinitions.find(d => d.id === selectedDefinitionId) as any;
            if (remote) {
                const data = remote.originalData as any;
                // Parse attributes if string
                let attrs = data.attributes || [];
                if (typeof attrs === 'string') {
                    try { attrs = JSON.parse(attrs); } catch (e) { attrs = []; }
                }
                return {
                    id: selectedDefinitionId,
                    name: data.name,
                    type: data.type,
                    attributes: attrs
                } as DataDefinition;
            }
            return null;
        }
        return definitions.find(d => d.id === selectedDefinitionId);
    }, [selectedDefinitionId, definitions, availableDefinitions]);

    const handleImportAttributes = (attributes: string[]) => {
        if (!selectedDef || !selectedDef.attributes) return;

        let finalDefinitionId = selectedDef.id;

        // If it's a remote definition, we MUST import it into the local model FIRST
        if (selectedDef.id.startsWith('remote:') && onAddDefinition) {
            console.log('[SchemaBuilder] Importing remote definition before linking...');
            const newId = onAddDefinition({
                name: selectedDef.name,
                type: selectedDef.type,
                description: `Imported from remote suggestion`,
                attributes: selectedDef.attributes
            });
            finalDefinitionId = newId;
        }

        const attributesToAdd = selectedDef.attributes
            .filter(attr => attributes.includes(attr.name))
            .map(attr => ({
                name: attr.name,
                type: attr.type,
                required: false, // Default to optional for event payload
                definitionId: finalDefinitionId,
                attributeKey: attr.name,
                description: selectedDef.name + " attribute"
            }));

        // Merge avoiding duplicates by name
        const currentNames = fields.map(f => f.name);
        const uniqueToAdd = attributesToAdd.filter(newF => !currentNames.includes(newF.name));

        onUpdateNode(node.id, 'fields', [...fields, ...uniqueToAdd]);
        setIsImportOpen(false);
        setSelectedDefinitionId('');
        setSelectedAttributes(new Set());
    };

    const handleDefinitionChange = (id: string) => {
        setSelectedDefinitionId(id);
        const def = id.startsWith('remote:')
            ? selectedDef // already found in memo
            : definitions.find(d => d.id === id);

        if (def && def.attributes) {
            // Default to all that aren't already added
            const toSelect = def.attributes
                .filter(attr => !fields.some(f => f.definitionId === def.id && f.attributeKey === attr.name))
                .map(attr => attr.name);
            setSelectedAttributes(new Set(toSelect));
        } else {
            setSelectedAttributes(new Set());
        }
    };

    const toggleAttribute = (name: string) => {
        const next = new Set(selectedAttributes);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        setSelectedAttributes(next);
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Schema (Payload)</label>
                <div className="flex gap-1">
                    <GlassTooltip content="Import from Data Dictionary">
                        <GlassButton size="sm" variant="ghost" onClick={() => setIsImportOpen(!isImportOpen)}>
                            <Import size={14} />
                        </GlassButton>
                    </GlassTooltip>
                    <GlassTooltip content="Add Ad-hoc Field">
                        <GlassButton size="sm" variant="ghost" onClick={handleAddField}>
                            <Plus size={14} />
                        </GlassButton>
                    </GlassTooltip>
                </div>
            </div>

            {/* Import Modal / Area */}
            {isImportOpen && (
                <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-200 dark:border-white/10 mb-2">
                    <h4 className="text-xs font-bold mb-2">Import from Definition</h4>
                    <select
                        className="w-full bg-white dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-sm mb-2 outline-none focus:ring-1 focus:ring-purple-500/50"
                        value={selectedDefinitionId}
                        onChange={(e) => handleDefinitionChange(e.target.value)}
                    >
                        <option value="">Select an Entity/Aggregate...</option>
                        {availableDefinitions.map(d => {
                            const isMember = (d as any).parentId === node.aggregate;
                            const isRemote = (d as any).isRemote;
                            const label = `${d.name} (${d.type})${isMember ? ' ⭐' : ''}${d.isRoot ? ' (ROOT)' : ''}${isRemote ? ` [From ${(d as any).modelName}]` : ''}`;
                            return <option key={d.id} value={d.id}>{label}</option>;
                        })}
                    </select>

                    {selectedDef && selectedDef.attributes && (
                        <>
                            <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto mb-3 custom-scrollbar pr-1">
                                {selectedDef.attributes.map(attr => {
                                    const isAlreadyAdded = fields.some(f => f.definitionId === selectedDef.id && f.attributeKey === attr.name);
                                    const isSelected = selectedAttributes.has(attr.name);

                                    return (
                                        <div key={attr.name} className="flex items-center gap-2 text-sm">
                                            <button
                                                onClick={() => !isAlreadyAdded && toggleAttribute(attr.name)}
                                                disabled={isAlreadyAdded}
                                                className={`flex items-center gap-2 w-full text-left p-1 rounded hover:bg-white/10 transition-colors ${isAlreadyAdded ? 'opacity-30 cursor-not-allowed' : 'hover:text-purple-400'}`}
                                            >
                                                {isAlreadyAdded || isSelected ? <CheckSquare size={14} className={isAlreadyAdded ? 'text-slate-400' : 'text-purple-500'} /> : <Square size={14} />}
                                                <span className="font-mono text-[11px] flex-1">{attr.name}</span>
                                                <span className="text-[9px] opacity-40 uppercase">{attr.type}</span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleImportAttributes(Array.from(selectedAttributes))}
                                    disabled={selectedAttributes.size === 0}
                                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-bold py-1.5 rounded transition-colors shadow-lg shadow-purple-500/20"
                                >
                                    Import {selectedAttributes.size} Field{selectedAttributes.size !== 1 ? 's' : ''}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsImportOpen(false);
                                        setSelectedDefinitionId('');
                                        setSelectedAttributes(new Set());
                                    }}
                                    className="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Fields List */}
            <div className="flex flex-col gap-2">
                {fields.length === 0 && <p className="text-xs text-slate-400 italic">No fields defined.</p>}
                {fields.map((field, idx) => {
                    const isLinked = !!field.definitionId;
                    const definition = definitions.find(d => d.id === field.definitionId);
                    const linkedAttribute = definition?.attributes?.find(a => a.name === field.attributeKey);

                    // Use linked data if available, otherwise fallback to stored field data
                    const displayName = linkedAttribute ? linkedAttribute.name : field.name;
                    const displayType = linkedAttribute ? linkedAttribute.type : field.type;
                    const isBrokenLink = isLinked && !linkedAttribute;

                    return (
                        <div key={idx} className="group relative flex flex-col gap-1 bg-white/50 dark:bg-white/5 p-2 rounded border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-2">
                                <div className="relative w-1/3 flex items-center">
                                    <input
                                        className={`bg-transparent font-mono text-xs font-bold w-full outline-none focus:text-purple-500 ${isLinked ? 'text-purple-600 dark:text-purple-400 cursor-not-allowed' : 'text-slate-700 dark:text-slate-200'} ${isBrokenLink ? 'text-red-500 decoration-wavy underline' : ''}`}
                                        value={displayName}
                                        onChange={(e) => !isLinked && handleUpdateField(idx, { name: e.target.value })}
                                        placeholder="name"
                                        disabled={isLinked}
                                        title={isBrokenLink ? "Linked attribute not found in definition" : ""}
                                    />
                                    {isLinked && (
                                        <div className="absolute -left-1.5 opacity-40">
                                            <div className="w-1 h-3 bg-purple-500 rounded-full" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-slate-400 opacity-30">:</span>

                                <div className="relative w-1/3">
                                    <select
                                        className={`bg-transparent text-xs w-full outline-none appearance-none cursor-pointer transition-colors ${isLinked ? 'text-purple-500/80 cursor-not-allowed' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 focus:text-purple-500'}`}
                                        value={displayType}
                                        onChange={(e) => !isLinked && handleUpdateField(idx, { type: e.target.value })}
                                        disabled={isLinked}
                                    >
                                        {PRIMITIVE_TYPES.map(t => (
                                            <option key={t} value={t} className="bg-white dark:bg-slate-900">{t}</option>
                                        ))}
                                        {!PRIMITIVE_TYPES.includes(displayType) && (
                                            <option value={displayType} className="bg-white dark:bg-slate-900 italic">{displayType}</option>
                                        )}
                                    </select>
                                </div>

                                <div className="ml-auto flex items-center gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                                    {isLinked ? (
                                        <GlassTooltip content={`Linked to ${definition?.name || 'Dictionary'}. Click to unlink.`}>
                                            <button
                                                className="p-1 hover:bg-purple-500/10 text-purple-500 rounded transition-colors"
                                                onClick={() => handleUpdateField(idx, { definitionId: undefined, attributeKey: undefined })}
                                            >
                                                <Link2 size={14} />
                                            </button>
                                        </GlassTooltip>
                                    ) : (
                                        <button
                                            className={`p-1 hover:bg-purple-500/10 rounded transition-colors ${field.required ? 'text-purple-500' : 'text-slate-400'}`}
                                            onClick={() => handleUpdateField(idx, { required: !field.required })}
                                            title={field.required ? "Required" : "Optional"}
                                        >
                                            {field.required ? <CheckSquare size={14} /> : <Square size={14} />}
                                        </button>
                                    )}
                                    <button
                                        className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded text-slate-400 transition-colors"
                                        onClick={() => handleRemoveField(idx)}
                                        title="Remove Field"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                            {isLinked && (
                                <div className="text-[10px] text-purple-500/60 flex items-center gap-1 pl-1">
                                    <Link2 size={10} /> Linked to {definition?.name || 'Data Dictionary'}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
