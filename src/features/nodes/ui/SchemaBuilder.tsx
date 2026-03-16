import React, { useCallback } from 'react';
import { Plus, X, CheckSquare, Square, Link2 } from 'lucide-react';
import { Node, Field, DataDefinition, DefinitionType } from '../../modeling/domain/types';
import { GlassButton } from '../../../shared/components/GlassButton';
import { GlassTooltip } from '../../../shared/components/GlassTooltip';
import { InlineOmnibar } from './InlineOmnibar';

interface SchemaBuilderProps {
    node: Node;
    onUpdateNode: <K extends keyof Node>(id: string, key: K, value: Node[K]) => void;
    definitions: DataDefinition[];
    crossModelDefinitions?: any[];
    onAddDefinition?: (def: Omit<DataDefinition, 'id'>) => string;
}

const getTypeColor = (type: DefinitionType) => {
    switch (type) {
        case DefinitionType.Aggregate:   return 'bg-emerald-500';
        case DefinitionType.Entity:      return 'bg-blue-500';
        case DefinitionType.ValueObject: return 'bg-purple-500';
        case DefinitionType.Enum:        return 'bg-amber-500';
        default:                         return 'bg-gray-400';
    }
};

// Primitives allowed by Weavr Schema
const PRIMITIVE_TYPES = [
    'String', 'Boolean', 'Int', 'Double', 'Decimal', 'Long', 'Date', 'DateTime', 'UUID'
];

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({
    node,
    onUpdateNode,
    definitions,
    onAddDefinition
}) => {
    const fields = node.fields || [];

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

    // ─── Omnibar callbacks ─────────────────────────────────────────
    const handleOmnibarAddFields = useCallback((newFields: Field[]) => {
        // Merge avoiding duplicates by name
        const currentNames = fields.map(f => f.name);
        const uniqueToAdd = newFields.filter(f => !currentNames.includes(f.name));
        if (uniqueToAdd.length > 0) {
            onUpdateNode(node.id, 'fields', [...fields, ...uniqueToAdd]);
        }
    }, [fields, node.id, onUpdateNode]);

    const handleCreateOrphan = useCallback((name: string): string => {
        if (!onAddDefinition) return '';
        // Create a new Entity definition with a single self-named attribute
        return onAddDefinition({
            name,
            type: DefinitionType.Entity,
            description: '',
            attributes: [{ name, type: 'String' }],
        });
    }, [onAddDefinition]);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Schema (Payload)</label>
                <GlassTooltip content="Add Ad-hoc Field">
                    <GlassButton size="sm" variant="ghost" onClick={handleAddField}>
                        <Plus size={14} />
                    </GlassButton>
                </GlassTooltip>
            </div>

            {/* Inline Omnibar — replaces old Import Modal */}
            <InlineOmnibar
                definitions={definitions}
                existingFields={fields}
                onAddFields={handleOmnibarAddFields}
                onCreateOrphan={handleCreateOrphan}
            />

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
                                <div className="text-[10px] flex items-center gap-1 pl-1">
                                    <Link2 size={10} className="text-purple-500/60" />
                                    {definition ? (
                                        <span className="inline-flex items-center gap-1">
                                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${getTypeColor(definition.type)}`} />
                                            <span className="text-purple-500/60">{definition.name}</span>
                                        </span>
                                    ) : (
                                        <span className="text-amber-500/60 italic">Unassigned</span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
