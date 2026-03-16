import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { Plus, X, ChevronDown, CheckSquare, Square, Search, Link2, Eye, Keyboard } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Node, Field, DataDefinition, DefinitionType, ElementType, Link } from '../../modeling/domain/types';
import { GlassButton } from '../../../shared/components/GlassButton';
import { GlassTooltip } from '../../../shared/components/GlassTooltip';
import { InlineOmnibar } from './InlineOmnibar';
import { useFlattenedDictionary, SearchableAttribute } from '../../dictionary/store/useFlattenedDictionary';
import { PRIMITIVE_TYPES } from '../../modeling/domain/constants';

interface SchemaBuilderProps {
    node: Node;
    onUpdateNode: <K extends keyof Node>(id: string, key: K, value: Node[K]) => void;
    definitions: DataDefinition[];
    onAddDefinition?: (def: Omit<DataDefinition, 'id'>) => string;
    allNodes?: Node[];
    allLinks?: Link[];
}

// ─── Sub-component for in-place linking ────────────────────────────
const QuickPickLinker: React.FC<{
    query: string;
    definitions: DataDefinition[];
    onSelect: (attr: SearchableAttribute) => void;
    onClose: () => void;
    anchorRect?: DOMRect;
}> = ({ query: initialQuery, definitions, onSelect, onClose, anchorRect }) => {
    const [query, setQuery] = useState(initialQuery);
    const { attributes } = useFlattenedDictionary(definitions, query);
    const containerRef = useRef<HTMLDivElement>(null);

    // Track position if anchorRect is provided
    const [style, setStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        if (!anchorRect) return;
        setStyle({
            position: 'fixed',
            top: anchorRect.top,
            right: window.innerWidth - anchorRect.left + 8, // To the left of the button
            zIndex: 9999,
        });
    }, [anchorRect]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as globalThis.Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    return createPortal(
        <div
            ref={containerRef}
            style={style}
            className="w-[220px] bg-white dark:bg-neutral-900 border border-blue-500/30 shadow-xl rounded-lg p-1 animate-in zoom-in-95 duration-100"
        >
            <div className="relative mb-1">
                <Search size={12} className="absolute left-2 top-1/2 -trangray-y-1/2 text-gray-400" />
                <input
                    autoFocus
                    className="py-2 px-3 ps-9 block w-full border-gray-200 dark:border-neutral-700 rounded-lg text-xs bg-white dark:bg-neutral-900 text-gray-800 dark:text-neutral-200 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none transition-all"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search attributes..."
                />
            </div>
            <div className="max-h-40 overflow-y-auto">
                {attributes.length === 0 && (
                    <div className="p-3 text-center text-[10px] text-gray-400 italic">No matches found.</div>
                )}
                {attributes.map((attr) => (
                    <button
                        key={`${attr.parentEntityId}:${attr.attribute.name}`}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-purple-500/10 transition-colors flex items-center gap-2 group"
                        onClick={() => onSelect(attr)}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getTypeColor(attr.entityType)}`} />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 group-hover:text-purple-500 truncate">
                                {attr.attribute.name}
                            </span>
                            <span className="text-[9px] text-gray-400 truncate">
                                in {attr.parentName ?? 'Orphan'}
                            </span>
                        </div>
                        <div className="ml-auto flex flex-col items-end gap-0.5">
                            <span className="text-[9px] text-gray-300 font-mono uppercase">{attr.attribute.type}</span>
                            <span className={`text-[7px] font-bold px-1 rounded ${getTypeColor(attr.entityType)} text-white opacity-80`}>
                                {attr.entityType.substring(0, 3).toUpperCase()}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>,
        document.body
    );
};

const getTypeColor = (type: DefinitionType) => {
    switch (type) {
        case DefinitionType.Aggregate: return 'bg-emerald-500';
        case DefinitionType.Entity: return 'bg-blue-500';
        case DefinitionType.ValueObject: return 'bg-purple-500';
        case DefinitionType.Enum: return 'bg-amber-500';
        default: return 'bg-gray-400';
    }
};

// Primitives allowed by Weavr Schema
// (Now using shared constant)

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({
    node,
    onUpdateNode,
    definitions,
    allNodes = [],
    allLinks = [],
    onAddDefinition
}) => {
    const fields = node.fields || [];

    // ICC: Compute available fields from incoming Read Models (for Screen smart defaults)
    const availableIncomingFields = useMemo(() => {
        if (node.type !== ElementType.Screen) return [];
        const incoming = allLinks.filter(l => l.target === node.id);
        const fieldsSet = new Set<string>();
        incoming.forEach(link => {
            const source = allNodes.find(n => n.id === link.source);
            if (source?.type === ElementType.ReadModel) {
                (source.fields || []).forEach(f => fieldsSet.add(f.name));
            }
        });
        return Array.from(fieldsSet);
    }, [node.id, node.type, allNodes, allLinks]);
    const [linkingFieldIndex, setLinkingFieldIndex] = React.useState<{ index: number, rect: DOMRect } | null>(null);

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
            type: DefinitionType.ValueObject,
            description: '',
            attributes: [{ name, type: 'String' }],
        });
    }, [onAddDefinition]);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center mb-1">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Schema (Payload)</h4>
                <GlassButton variant="ghost" size="sm" onClick={handleAddField}>
                    <Plus size={14} className="mr-1" /> Add
                </GlassButton>
            </div>

            {/* Inline Omnibar — replaces old Import Modal */}
            <InlineOmnibar
                definitions={definitions}
                existingFields={fields}
                onAddFields={handleOmnibarAddFields}
                onCreateOrphan={handleCreateOrphan}
                availableFields={availableIncomingFields}
                isScreen={node.type === ElementType.Screen}
            />

            {/* Fields List */}
            <div className="flex flex-col gap-2">
                {fields.length === 0 && <p className="text-xs text-gray-400 italic">No fields defined.</p>}
                {fields.map((field, idx) => {
                    const isLinked = !!field.definitionId;
                    const definition = definitions.find(d => d.id === field.definitionId);
                    const linkedAttribute = definition?.attributes?.find(a => a.name === field.attributeKey);

                    // Use linked data if available, otherwise fallback to stored field data
                    const displayName = linkedAttribute ? linkedAttribute.name : field.name;
                    const displayType = linkedAttribute ? linkedAttribute.type : field.type;
                    const isBrokenLink = isLinked && !linkedAttribute;

                    return (
                        <div key={idx} className="group relative flex flex-col gap-1 bg-white dark:bg-neutral-900 p-2 rounded-lg border border-gray-200 dark:border-neutral-700 hover:border-blue-500/50 transition-colors shadow-sm">
                            <div className="flex items-center gap-2">
                                {/* Required Indicator (Left) */}
                                <div className="flex-shrink-0">
                                    <GlassTooltip content={field.required ? "This field is MANDATORY for this element" : "This field is OPTIONAL for this element"}>
                                        <button
                                            className={`h-8 w-8 flex items-center justify-center rounded-lg cursor-pointer transition-all border ${field.required
                                                ? "bg-amber-500/10 border-amber-500/50 text-amber-600 shadow-sm"
                                                : "bg-gray-100 dark:bg-neutral-800 border-transparent text-gray-400 opacity-40 hover:opacity-100"
                                                }`}
                                            onClick={() => handleUpdateField(idx, { required: !field.required })}
                                            aria-label={field.required ? "Mark as Optional" : "Mark as Required"}
                                            title={field.required ? "Mark as Optional" : "Mark as Required"}
                                        >
                                            {field.required ? <CheckSquare size={14} /> : <Square size={14} />}
                                        </button>
                                    </GlassTooltip>
                                </div>

                                <div className="relative w-1/2 flex items-center gap-1.5">
                                    {isLinked && (
                                        <div className="absolute -left-1 opacity-60 z-10">
                                            <div className="w-0.5 h-3 bg-blue-500 rounded-full" />
                                        </div>
                                    )}

                                    {/* Role Toggle (Screen Only) */}
                                    {node.type === ElementType.Screen && (
                                        <GlassTooltip content={field.role === 'display' ? "Displaying data from Read Model" : "Capturing user input for Command"}>
                                            <button
                                                className={`h-8 w-7 flex items-center justify-center rounded-lg cursor-pointer transition-all border ${field.role === 'display'
                                                    ? "bg-blue-500/10 border-blue-500/30 text-blue-500"
                                                    : "bg-gray-100 dark:bg-neutral-800 border-transparent text-gray-400 opacity-60 hover:opacity-100"
                                                    }`}
                                                onClick={() => handleUpdateField(idx, { role: field.role === 'display' ? 'input' : 'display' })}
                                                aria-label={field.role === 'display' ? "Switch to Input Role" : "Switch to Display Role"}
                                                title={field.role === 'display' ? "Switch to Input Role" : "Switch to Display Role"}
                                            >
                                                {field.role === 'display' ? <Eye size={12} /> : <Keyboard size={12} />}
                                            </button>
                                        </GlassTooltip>
                                    )}

                                    <input
                                        className={`h-8 px-2.5 block w-full border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-mono font-bold bg-white dark:bg-neutral-950 focus:border-blue-500 focus:ring-blue-500 transition-all ${isLinked
                                            ? 'text-blue-600 dark:text-blue-400 cursor-not-allowed bg-gray-50 dark:bg-neutral-800'
                                            : 'text-gray-700 dark:text-neutral-200'
                                            } ${isBrokenLink ? 'border-red-500 text-red-500' : ''}`}
                                        value={displayName}
                                        onChange={(e) => !isLinked && handleUpdateField(idx, { name: e.target.value })}
                                        placeholder="name"
                                        disabled={isLinked}
                                        title={isBrokenLink ? "Linked attribute not found in definition" : ""}
                                    />
                                </div>

                                <span className="text-gray-400 opacity-30">:</span>

                                <div className="relative w-1/3">
                                    <select
                                        className={`h-8 px-2.5 pr-6 block w-full border-gray-200 dark:border-neutral-700 rounded-lg text-xs bg-white dark:bg-neutral-950 focus:border-blue-500 focus:ring-blue-500 appearance-none transition-all ${isLinked
                                            ? 'text-blue-500/80 cursor-not-allowed bg-gray-50 dark:bg-neutral-800'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-neutral-300'
                                            }`}
                                        value={displayType}
                                        onChange={(e) => !isLinked && handleUpdateField(idx, { type: e.target.value })}
                                        disabled={isLinked}
                                    >
                                        <optgroup label="Primitives">
                                            {PRIMITIVE_TYPES.map(t => (
                                                <option key={t} value={t} className="bg-white dark:bg-neutral-900">{t}</option>
                                            ))}
                                        </optgroup>
                                        {!PRIMITIVE_TYPES.includes(displayType) && (
                                            <option value={displayType} className="bg-white dark:bg-neutral-900 italic">{displayType}</option>
                                        )}
                                    </select>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                        <ChevronDown size={10} />
                                    </div>
                                </div>

                                {/* Actions (Right) */}
                                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isLinked ? (
                                        <GlassTooltip content={`Linked to Domain Entity: ${definition?.name}. Click to unlink and make ad-hoc.`}>
                                            <button
                                                className="h-8 px-2 flex items-center justify-center hover:bg-purple-500/10 text-purple-500 rounded-lg transition-colors border border-blue-500/20 cursor-pointer"
                                                onClick={() => handleUpdateField(idx, { definitionId: undefined, attributeKey: undefined })}
                                                aria-label="Unlink from Domain Entity"
                                                title="Unlink from Domain Entity"
                                            >
                                                <Link2 size={14} />
                                            </button>
                                        </GlassTooltip>
                                    ) : (
                                        <GlassTooltip content="Link this ad-hoc field to a Domain Entity">
                                            <button
                                                className="h-8 px-2 flex items-center justify-center hover:bg-blue-500/10 text-blue-500 rounded-lg transition-colors border border-blue-500/20 cursor-pointer"
                                                onClick={(e) => setLinkingFieldIndex({ index: idx, rect: e.currentTarget.getBoundingClientRect() })}
                                                aria-label="Link to Domain Entity"
                                                title="Link to Domain Entity"
                                            >
                                                <Link2 size={14} />
                                            </button>
                                        </GlassTooltip>
                                    )}

                                    {isLinked ? (
                                        <div className="h-8 px-2 flex items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[9px] font-bold tracking-tight uppercase">
                                            Linked
                                        </div>
                                    ) : (
                                        <GlassTooltip content="Remove this field">
                                            <button
                                                onClick={() => handleRemoveField(idx)}
                                                className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                                                aria-label="Remove Field"
                                                title="Remove Field"
                                            >
                                                <X size={14} />
                                            </button>
                                        </GlassTooltip>
                                    )}
                                    {/* In-place Linker UI */}
                                    {linkingFieldIndex?.index === idx && (
                                        <QuickPickLinker
                                            query={displayName}
                                            definitions={definitions}
                                            anchorRect={linkingFieldIndex.rect}
                                            onSelect={(attr) => {
                                                handleUpdateField(idx, {
                                                    definitionId: attr.parentEntityId ?? undefined,
                                                    attributeKey: attr.attribute.name,
                                                    name: attr.attribute.name,
                                                    type: attr.attribute.type
                                                });
                                                setLinkingFieldIndex(null);
                                            }}
                                            onClose={() => setLinkingFieldIndex(null)}
                                        />
                                    )}
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
