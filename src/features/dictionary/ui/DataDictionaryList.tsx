import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DataDefinition, DefinitionType } from '../../modeling';
import { Plus, X, Lock, ChevronDown, Trash2, AlertTriangle } from 'lucide-react';
import SmartSelect from '../../../shared/components/SmartSelect';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';
import { useCrossModelData } from '../../modeling';
import { Button } from '../../../shared/components/ui/button';
import { cn } from '../../../shared/lib/utils';
import { GlassSelect } from '../../../shared/components/GlassSelect';

import { PRIMITIVE_TYPES } from '../../modeling/domain/constants';
import { useDebouncedInput } from '../../../shared/hooks/useDebouncedInput';
import { Input } from '../../../shared/components/ui/input';
import { Textarea } from '../../../shared/components/ui/textarea';
import { Label } from '../../../shared/components/ui/label';

interface DataDictionaryListProps {
    definitions: DataDefinition[];
    onAddDefinition: (def: Omit<DataDefinition, 'id'>) => string;
    onUpdateDefinition: (id: string, def: Partial<DataDefinition>) => void;
    onRemoveDefinition: (id: string) => void;
    modelId: string | null;
    orphanedFields?: { name: string, type: string, nodeIds: string[] }[];
    onLinkFieldToDefinition?: (fieldName: string, fieldType: string, definitionId: string) => void;
}


const getTypeColor = (type: DefinitionType) => {
    switch (type) {
        case DefinitionType.Aggregate: return 'bg-emerald-500';
        case DefinitionType.Entity: return 'bg-blue-500';
        case DefinitionType.ValueObject: return 'bg-purple-500';
        case DefinitionType.Enum: return 'bg-amber-500';
        default: return 'bg-slate-400';
    }
};

const getTypeLabelKey = (type: DefinitionType) => {
    switch (type) {
        case DefinitionType.Aggregate: return 'modeling.elements.aggregate';
        case DefinitionType.Entity: return 'modeling.elements.entity';
        case DefinitionType.ValueObject: return 'modeling.elements.valueObject';
        case DefinitionType.Enum: return 'modeling.elements.enum';
        default: return '';
    }
};

const DuplicateWarning: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[9px] font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1">
            <AlertTriangle size={8} />
            {t('dataDictionary.duplicateName').toUpperCase()}
        </div>
    );
};

// Helper for consistent debounced inputs
const DictionaryInput: React.FC<{
    value: string;
    onCommit: (val: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
}> = ({ value: initialValue, onCommit, placeholder, className, label }) => {
    const { value, onChange, onBlur, onKeyDown } = useDebouncedInput(initialValue, onCommit);
    return (
        <div className="flex flex-col gap-1.5 w-full">
            {label && <Label className="ml-1">{label}</Label>}
            <Input
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                className={className}
            />
        </div>
    );
};

const DictionaryTextarea: React.FC<{
    value: string;
    onCommit: (val: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
}> = ({ value: initialValue, onCommit, placeholder, className, label }) => {
    const { value, onChange, onBlur, onKeyDown } = useDebouncedInput(initialValue, onCommit);
    return (
        <div className="flex flex-col gap-1.5 w-full">
            {label && <Label className="ml-1">{label}</Label>}
            <Textarea
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                className={className}
            />
        </div>
    );
};
const DataDictionaryItem = React.memo<{
    def: DataDefinition;
    definitions: DataDefinition[];
    parent?: DataDefinition;
    isDuplicate: boolean;
    aggregateOptions: any[];
    t: any;
    onUpdate: (id: string, def: Partial<DataDefinition>) => void;
    onRemove: (id: string, anchorEl: HTMLElement | any) => void;
    onAddAttribute: (defId: string, attrs: any[]) => void;
    onUpdateAttribute: (defId: string, attrs: any[], index: number, field: 'name' | 'type', value: string) => void;
    onSetPII: (defId: string, attrs: any[], index: number, isPII: boolean) => void;
    onDeleteAttribute: (defId: string, attrs: any[], index: number) => void;
    typeSuggestions: string[];
}>(({
    def,
    definitions,
    parent,
    isDuplicate,
    aggregateOptions,
    t,
    onUpdate,
    onRemove,
    onAddAttribute,
    onUpdateAttribute,
    onSetPII,
    onDeleteAttribute,
    typeSuggestions
}) => {
    return (
        <details
            className={`group bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-lg overflow-hidden open:bg-slate-100/50 dark:open:bg-slate-800 transition-all duration-200 shadow-sm ${def.parentId ? 'ml-6' : ''}`}
        >
            <summary className="flex items-center gap-3 p-3 cursor-pointer list-none hover:bg-slate-100/80 dark:hover:bg-slate-800/80 select-none text-sm focus:outline-none">
                <ChevronDown className="group-open:rotate-180 text-slate-500 transition-transform duration-200" size={16} />
                <div className={`w-2.5 h-2.5 rounded-full ${getTypeColor(def.type)} ${def.isRoot ? 'ring-2 ring-emerald-500/50' : ''} shadow-sm`} />

                <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{def.name}</span>
                        {def.isRoot && (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-tighter">{t('dataDictionary.root')}</span>
                        )}
                    </div>
                    {parent && <span className="text-[10px] text-slate-500 opacity-60">{t('dataDictionary.partOf', { name: parent.name })}</span>}
                </div>

                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                    {t(getTypeLabelKey(def.type))}
                </span>
            </summary>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                {/* Aggregate Members Section (Only for Aggregates) */}
                {def.type === DefinitionType.Aggregate && (
                    <div className="mb-6">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">{t('dataDictionary.aggregateMembers')}</h4>
                        <div className="space-y-1">
                            {definitions.filter(d => d.parentId === def.id).map(member => (
                                <div key={member.id} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200">
                                    <div className={`w-1.5 h-1.5 rounded-full ${getTypeColor(member.type)}`} />
                                    <span className="flex-1 font-medium">{member.name}</span>
                                    {member.isRoot ? (
                                        <span className="text-[9px] text-emerald-500 font-bold">{t('dataDictionary.root').toUpperCase()}</span>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="xs"
                                            onClick={() => {
                                                // Unset previous roots for this parent
                                                definitions.filter(d => d.parentId === def.id && d.isRoot).forEach(r => {
                                                    onUpdate(r.id, { isRoot: false });
                                                });
                                                // Set this one
                                                onUpdate(member.id, { isRoot: true });
                                            }}
                                            className="text-[9px] text-slate-500 hover:text-emerald-500 transition-colors uppercase font-bold p-0 h-auto"
                                        >
                                            {t('dataDictionary.makeRoot')}
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {definitions.filter(d => d.parentId === def.id).length === 0 && (
                                <div className="text-[10px] text-slate-500 italic p-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                                    {t('dataDictionary.noMembers')}
                                </div>
                            )}
                        </div>
                        <div className="h-px bg-slate-200 dark:bg-slate-700 mt-6"></div>
                    </div>
                )}

                {/* Definition Form */}
                <div className="flex flex-col gap-4 mb-6">
                    <DictionaryInput
                        label={t('dataDictionary.nameLabel')}
                        value={def.name || ''}
                        onCommit={(val: string) => onUpdate(def.id, { name: val })}
                    />

                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getTypeColor(def.type)}`} />
                        <span className={`text-[11px] font-bold truncate ${isDuplicate ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            {def.name}
                        </span>
                        {isDuplicate && <DuplicateWarning />}
                        <span className="ml-auto text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                            {t(getTypeLabelKey(def.type))}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <GlassSelect
                                label={t('dataDictionary.typeLabel')}
                                value={def.type}
                                options={[
                                    { id: DefinitionType.Aggregate, label: t('modeling.elements.aggregate'), icon: <div className="w-2 h-2 rounded-full bg-emerald-500" /> },
                                    { id: DefinitionType.Entity, label: t('modeling.elements.entity'), icon: <div className="w-2 h-2 rounded-full bg-blue-500" /> },
                                    { id: DefinitionType.ValueObject, label: t('modeling.elements.valueObject'), icon: <div className="w-2 h-2 rounded-full bg-purple-500" /> },
                                    { id: DefinitionType.Enum, label: t('modeling.elements.enum'), icon: <div className="w-2 h-2 rounded-full bg-amber-500" /> },
                                ]}
                                onChange={(val: string) => onUpdate(def.id, { type: val as DefinitionType })}
                            />
                        </div>

                        {def.type !== DefinitionType.Aggregate && (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">{t('dataDictionary.parentAggregate')}</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <SmartSelect
                                            options={aggregateOptions}
                                            value={def.parentId || '__none__'}
                                            onChange={(id: string) => {
                                                const newParentId = (id === '__none__' || !id) ? undefined : id;
                                                onUpdate(def.id, {
                                                    parentId: newParentId,
                                                    isRoot: newParentId ? def.isRoot : false // Clear root if unlinking
                                                });
                                            }}
                                            placeholder={t('dataDictionary.none')}
                                            allowCustomValue={false}
                                        />
                                    </div>
                                    {def.parentId && (
                                        <button
                                            onClick={() => {
                                                if (!def.isRoot) {
                                                    // Unset others
                                                    definitions.filter(d => d.parentId === def.parentId && d.isRoot).forEach(r => {
                                                        onUpdate(r.id, { isRoot: false });
                                                    });
                                                }
                                                onUpdate(def.id, { isRoot: !def.isRoot });
                                            }}
                                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all shadow-sm ${def.isRoot ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-500 bg-white dark:bg-slate-800 hover:border-emerald-500/50'}`}
                                        >
                                            {t('dataDictionary.root').toUpperCase()}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5 mt-2">
                        <DictionaryTextarea
                            label={t('dataDictionary.descriptionLabel')}
                            value={def.description || ''}
                            onCommit={(val: string) => onUpdate(def.id, { description: val })}
                            className="min-h-[60px]"
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => onRemove(def.id, e.currentTarget)}
                        >
                            <Trash2 size={16} className="mr-1" /> {t('dataDictionary.deleteAction')}
                        </Button>
                    </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-700 mb-4"></div>

                {/* Attributes */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{t('dataDictionary.attributesLabel')}</h4>
                        <Button variant="ghost" size="sm" onClick={() => onAddAttribute(def.id, def.attributes || [])}>
                            <Plus size={14} className="mr-1" /> {t('dataDictionary.addAction')}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {(Array.isArray(def.attributes) ? def.attributes : []).map((attr, index) => (
                            <div key={index} className="group relative flex flex-col gap-1 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500/50 transition-colors shadow-sm">
                                <div className="flex items-center gap-2">
                                    {/* PII Toggle */}
                                    <div className="flex-shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            onClick={() => onSetPII(def.id, def.attributes || [], index, !attr.isPII)}
                                            className={cn(
                                                "rounded-lg transition-[background-color,border-color,color] border",
                                                attr.isPII
                                                    ? "bg-red-500/10 border-red-500/50 text-red-600 shadow-sm"
                                                    : "bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400 opacity-40 hover:opacity-100"
                                            )}
                                            title={attr.isPII ? t('dataDictionary.piiSensitive') : t('dataDictionary.piiMark')}
                                        >
                                            <Lock size={14} />
                                        </Button>
                                    </div>

                                    <div className="relative w-1/2 flex items-center">
                                        <div className="flex-1">
                                            <input
                                                className="h-8 px-2.5 block w-full border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:ring-blue-500 transition-[border-color,box-shadow] shadow-sm"
                                                value={attr.name}
                                                placeholder={t('dataDictionary.attributeNamePlaceholder')}
                                                onChange={(e) => onUpdateAttribute(def.id, def.attributes || [], index, 'name', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="relative w-1/3">
                                        <GlassSelect
                                            value={attr.type}
                                            options={[
                                                ...PRIMITIVE_TYPES.map(typeName => ({ id: typeName, label: typeName, group: t('dataDictionary.primitives') })),
                                                ...typeSuggestions.filter(typeName => !PRIMITIVE_TYPES.includes(typeName)).map(typeName => ({ id: typeName, label: typeName, group: t('dataDictionary.domainTypes') })),
                                                ...(!typeSuggestions.includes(attr.type) ? [{ id: attr.type, label: attr.type, group: t('dataDictionary.custom') }] : [])
                                            ] as any}
                                            onChange={(val) => onUpdateAttribute(def.id, def.attributes || [], index, 'type', val)}
                                            buttonClassName="h-8 py-0 px-2.5 text-xs font-mono font-bold"
                                        />
                                    </div>

                                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            onClick={() => onDeleteAttribute(def.id, def.attributes || [], index)}
                                            className="text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors p-0"
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(def.attributes || []).length === 0 && (
                            <p className="text-center text-xs text-slate-400 italic py-2">{t('dataDictionary.noAttributes')}</p>
                        )}
                    </div>
                </div>
            </div>
        </details>
    );
});

DataDictionaryItem.displayName = 'DataDictionaryItem';

const DataDictionaryList: React.FC<DataDictionaryListProps> = ({
    definitions,
    onAddDefinition,
    onUpdateDefinition,
    onRemoveDefinition,
    modelId,
    orphanedFields = [],
    onLinkFieldToDefinition
}) => {
    const { t } = useTranslation();
    const { crossModelDefinitions } = useCrossModelData(modelId);

    // State for deleting definitions
    const [deleteDefInfo, setDeleteDefInfo] = useState<{ id: string, anchorEl: HTMLElement } | null>(null);

    const isDuplicateName = useCallback((name: string, currentId?: string) => {
        return (definitions || []).some(d => d.name.toLowerCase() === name.toLowerCase() && d.id !== currentId);
    }, [definitions]);

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
                group: t('properties.aggregate')
            }));

        return [
            { id: '__none__', label: t('dataDictionary.none'), group: t('common.system') },
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
                subLabel: t('dataDictionary.fromModel', { model: d.modelName }),
                group: t('dataDictionary.suggestions'),
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
    const handleAddAttribute = useCallback((defId: string, currentAttributes: any[]) => {
        const newAttrs = [...(currentAttributes || []), { name: '', type: 'String' }];
        onUpdateDefinition(defId, { attributes: newAttrs });
    }, [onUpdateDefinition]);

    const handleUpdateAttribute = useCallback((defId: string, currentAttributes: any[], index: number, field: 'name' | 'type', value: string) => {
        const latestAttributes = [...(currentAttributes || [])];
        if (latestAttributes[index]) {
            latestAttributes[index] = { ...latestAttributes[index], [field]: value };
            onUpdateDefinition(defId, { attributes: latestAttributes });
        }
    }, [onUpdateDefinition]);

    const handleSetPII = useCallback((defId: string, currentAttributes: any[], index: number, isPII: boolean) => {
        const latestAttributes = [...(currentAttributes || [])];
        if (latestAttributes[index]) {
            latestAttributes[index] = { ...latestAttributes[index], isPII };
            onUpdateDefinition(defId, { attributes: latestAttributes });
        }
    }, [onUpdateDefinition]);

    const handleDeleteAttribute = useCallback((defId: string, currentAttributes: any[], index: number) => {
        const latestAttributes = [...(currentAttributes || [])];
        latestAttributes.splice(index, 1);
        onUpdateDefinition(defId, { attributes: latestAttributes });
    }, [onUpdateDefinition]);

    return (
        <div className="pb-24">
            {/* Unassigned Attributes (Orphaned Fields) */}
            {orphanedFields.length > 0 && (
                <div className="mb-8 p-4 bg-purple-500/5 rounded-xl border border-blue-500/20">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">{t('dataDictionary.unassignedAttributes')}</h3>
                            <span className="bg-purple-500/20 text-purple-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {orphanedFields.length}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {orphanedFields.map((field, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 group shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{field.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{field.type}</span>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="glass-emerald"
                                        size="xs"
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
                                        className="gap-x-1 uppercase font-bold"
                                    >
                                        {t('dataDictionary.toEntity')}
                                    </Button>
                                    <div className="relative group/menu">
                                        <Button
                                          variant="glass"
                                          size="xs"
                                          className="gap-x-1 uppercase font-bold text-purple-600 border-purple-500/20 hover:bg-purple-500 hover:text-white"
                                        >
                                            {t('dataDictionary.linkTo')}
                                        </Button>
                                        <div className="absolute right-0 bottom-full mb-1 hidden group-hover/menu:block z-[110] min-w-[140px]">
                                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-1 max-h-48 overflow-y-auto custom-scrollbar">
                                                {definitions.filter(d => d.type !== DefinitionType.Aggregate).map((def: DataDefinition) => (
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
                    onChange={(val: string, opt?: any) => handleAdd(val, opt)}
                    onCreate={(name: string) => handleAdd(name)}
                    placeholder={t('dataDictionary.addPlaceholder')}
                    allowCustomValue={true}
                    autoFocus={true}
                />
            </div>

            {/* List */}
            <div className="space-y-1">
                {definitions.map((def) => (
                    <DataDictionaryItem
                        key={def.id}
                        def={def}
                        definitions={definitions}
                        parent={definitions.find(d => d.id === def.parentId)}
                        isDuplicate={isDuplicateName(def.name, def.id)}
                        aggregateOptions={aggregateOptions}
                        t={t}
                        onUpdate={onUpdateDefinition}
                        onRemove={(id, anchorEl) => setDeleteDefInfo({ id, anchorEl })}
                        onAddAttribute={handleAddAttribute}
                        onUpdateAttribute={handleUpdateAttribute}
                        onSetPII={handleSetPII}
                        onDeleteAttribute={handleDeleteAttribute}
                        typeSuggestions={typeSuggestions}
                    />
                ))}

                {definitions.length === 0 && (
                    <p className="text-center text-slate-400 pt-8 italic">{t('dataDictionary.noDefinitions')}</p>
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
                message={t('dataDictionary.confirmDelete')}
            />
        </div>
    );
};

export default DataDictionaryList;
