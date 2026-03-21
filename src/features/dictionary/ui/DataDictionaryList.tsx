import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DataDefinition, DefinitionType } from '../../modeling';
import { Plus, X, Lock, ChevronDown, Trash2, AlertTriangle } from 'lucide-react';
import SmartSelect from '../../../shared/components/SmartSelect';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';
import { useCrossModelData } from '../../modeling';
import { GlassButton } from '../../../shared/components/GlassButton';
import { GlassSelect } from '../../../shared/components/GlassSelect';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PRIMITIVE_TYPES } from '../../modeling/domain/constants';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

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
        default: return 'bg-gray-400';
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

// Helper for optimizing updates/analytics
const DebouncedInput: React.FC<any> = ({ value, onCommit, ...props }) => {
    const [localValue, setLocalValue] = useState(value);
    useEffect(() => setLocalValue(value), [value]);

    return (
        <input
            {...props}
            className={cn(
                "py-1.5 px-3 block w-full border-gray-200 dark:border-neutral-700 rounded-lg text-xs bg-white dark:bg-neutral-900 text-gray-800 dark:text-neutral-200 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none transition-all",
                props.className
            )}
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
            className={cn(
                "py-2 px-3 block w-full border-gray-200 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-900 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-500 min-h-[60px]",
                className
            )}
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
    const { t } = useTranslation();
    const { crossModelDefinitions } = useCrossModelData(modelId);

    // State for deleting definitions
    const [deleteDefInfo, setDeleteDefInfo] = useState<{ id: string, anchorEl: HTMLElement } | null>(null);

    const isDuplicateName = (name: string, currentId?: string) => {
        return (definitions || []).some(d => d.name.toLowerCase() === name.toLowerCase() && d.id !== currentId);
    };

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
                            <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-700 group shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-800 dark:text-neutral-100">{field.name}</span>
                                    <span className="text-[10px] text-gray-400 font-mono">{field.type}</span>
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
                                        className="py-1 px-2 inline-flex items-center gap-x-1 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all uppercase"
                                    >
                                        {t('dataDictionary.toEntity')}
                                    </button>
                                    <div className="relative group/menu">
                                        <button className="py-1 px-2 inline-flex items-center gap-x-1 text-[10px] font-bold rounded-md bg-purple-500/10 text-purple-600 border border-blue-500/20 hover:bg-purple-500 hover:text-white transition-all uppercase">
                                            {t('dataDictionary.linkTo')}
                                        </button>
                                        <div className="absolute right-0 bottom-full mb-1 hidden group-hover/menu:block z-[110] min-w-[140px]">
                                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-xl p-1 max-h-48 overflow-y-auto custom-scrollbar">
                                                {definitions.filter(d => d.type !== DefinitionType.Aggregate).map(def => (
                                                    <button
                                                        key={def.id}
                                                        onClick={() => onLinkFieldToDefinition?.(field.name, field.type, def.id)}
                                                        className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-purple-500/10 rounded transition-colors text-gray-700 dark:text-gray-200 truncate"
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
                    placeholder={t('dataDictionary.addPlaceholder')}
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
                            className={`hs-accordion group bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg overflow-hidden open:bg-gray-50 dark:open:bg-neutral-700 open:border-white/20 transition-all duration-200 ${def.parentId ? 'ml-6' : ''}`}
                        >
                            <summary className="hs-accordion-toggle flex items-center gap-3 p-3 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-neutral-800/50 select-none text-sm focus:outline-none">
                                <ChevronDown className="hs-accordion-active:rotate-180 text-gray-500 transition-transform duration-200" size={16} />
                                <div className={`w-2.5 h-2.5 rounded-full ${getTypeColor(def.type)} ${def.isRoot ? 'ring-2 ring-emerald-500/50' : ''} shadow-sm`} />

                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-800 dark:text-neutral-100">{def.name}</span>
                                        {def.isRoot && (
                                            <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-tighter">{t('dataDictionary.root')}</span>
                                        )}
                                    </div>
                                    {parent && <span className="text-[10px] text-gray-500 opacity-60">{t('dataDictionary.partOf', { name: parent.name })}</span>}
                                </div>

                                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{def.type}</span>
                            </summary>

                            <div className="p-4 bg-gray-50 dark:bg-neutral-800 border-t border-gray-200 dark:border-neutral-700">
                                {/* Aggregate Members Section (Only for Aggregates) */}
                                {def.type === DefinitionType.Aggregate && (
                                    <div className="mb-6">
                                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">{t('dataDictionary.aggregateMembers')}</h4>
                                        <div className="space-y-1">
                                            {definitions.filter(d => d.parentId === def.id).map(member => (
                                                <div key={member.id} className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-neutral-800 rounded border border-gray-100 dark:border-neutral-700 text-xs text-gray-700 dark:text-neutral-200">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${getTypeColor(member.type)}`} />
                                                    <span className="flex-1 font-medium">{member.name}</span>
                                                    {member.isRoot ? (
                                                        <span className="text-[9px] text-emerald-500 font-bold">{t('dataDictionary.root').toUpperCase()}</span>
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
                                                            className="text-[9px] text-gray-500 hover:text-emerald-500 transition-colors uppercase font-bold"
                                                        >
                                                            {t('dataDictionary.makeRoot')}
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                             {definitions.filter(d => d.parentId === def.id).length === 0 && (
                                                  <div className="text-[10px] text-gray-500 italic p-2 border border-dashed border-gray-200 dark:border-neutral-700 rounded-lg">
                                                      {t('dataDictionary.noMembers')}
                                                  </div>
                                              )}
                                        </div>
                                        <div className="h-px bg-gray-200 dark:bg-neutral-700 mt-6"></div>
                                    </div>
                                )}

                                {/* Definition Form */}
                                <div className="flex flex-col gap-4 mb-6">
                                    <DebouncedInput
                                        label={t('dataDictionary.nameLabel')}
                                        value={def.name || ''}
                                        onCommit={(val: string) => onUpdateDefinition(def.id, { name: val })}
                                    />

                                    <div className="flex items-center gap-2">
                                         <div className={`w-2 h-2 rounded-full ${getTypeColor(def.type)}`} />
                                         <span className={`text-[11px] font-bold truncate ${isDuplicateName(def.name, def.id) ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-neutral-200'}`}>
                                             {def.name}
                                         </span>
                                         {isDuplicateName(def.name, def.id) && <DuplicateWarning />}
                                         <span className="ml-auto text-[9px] font-bold text-gray-400 uppercase tracking-tight">{def.type}</span>
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
                                                onChange={(val) => onUpdateDefinition(def.id, { type: val as DefinitionType })}
                                            />
                                        </div>

                                        {def.type !== DefinitionType.Aggregate && (
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">{t('dataDictionary.parentAggregate')}</label>
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
                                                                         onUpdateDefinition(r.id, { isRoot: false });
                                                                     });
                                                                 }
                                                                 onUpdateDefinition(def.id, { isRoot: !def.isRoot });
                                                             }}
                                                             className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all shadow-sm ${def.isRoot ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 dark:border-neutral-700 text-gray-500 bg-white dark:bg-neutral-800 hover:border-emerald-500/50'}`}
                                                         >
                                                             {t('dataDictionary.root').toUpperCase()}
                                                         </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                     <div className="flex flex-col gap-1.5 mt-2">
                                         <label className="text-sm font-medium text-gray-700 dark:text-neutral-300 ml-1">{t('dataDictionary.descriptionLabel')}</label>
                                         <DebouncedTextarea
                                             value={def.description || ''}
                                             onCommit={(val: string) => onUpdateDefinition(def.id, { description: val })}
                                             className="w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg px-4 py-2.5 outline-none text-gray-800 dark:text-neutral-100 placeholder-gray-500 min-h-[60px]"
                                         />
                                     </div>

                                    <div className="flex justify-end">
                                        <GlassButton
                                            variant="danger"
                                            size="sm"
                                            onClick={(e) => setDeleteDefInfo({ id: def.id, anchorEl: e.currentTarget })}
                                        >
                                            <Trash2 size={16} className="mr-1" /> {t('dataDictionary.deleteAction')}
                                        </GlassButton>
                                    </div>
                                </div>

                                 <div className="h-px bg-gray-200 dark:bg-neutral-700 mb-4"></div>

                                 {/* Attributes */}
                                  <div>
                                     <div className="flex items-center justify-between mb-4">
                                         <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{t('dataDictionary.attributesLabel')}</h4>
                                         <GlassButton variant="ghost" size="sm" onClick={() => handleAddAttribute(def)}>
                                             <Plus size={14} className="mr-1" /> {t('dataDictionary.addAction')}
                                         </GlassButton>
                                     </div>

                                     <div className="space-y-2">
                                         {(Array.isArray(def.attributes) ? def.attributes : []).map((attr, index) => (
                                             <div key={index} className="group relative flex flex-col gap-1 bg-white dark:bg-neutral-900 p-2 rounded-lg border border-gray-200 dark:border-neutral-700 hover:border-blue-500/50 transition-colors shadow-sm">
                                                 <div className="flex items-center gap-2">
                                                     {/* PII Toggle */}
                                                     <div className="flex-shrink-0">
                                                          <button
                                                              onClick={() => {
                                                                  const currentAttributes = [...(def.attributes || [])];
                                                                  if (currentAttributes[index]) {
                                                                      currentAttributes[index] = { ...currentAttributes[index], isPII: !attr.isPII };
                                                                       onUpdateDefinition(def.id, { attributes: currentAttributes });
                                                                   }
                                                               }}
                                                               className={`p-1.5 rounded-lg transition-all border ${
                                                                   attr.isPII 
                                                                       ? "bg-red-500/10 border-red-500/50 text-red-600 shadow-sm" 
                                                                       : "bg-gray-100 dark:bg-neutral-800 border-transparent text-gray-400 opacity-40 hover:opacity-100"
                                                               }`}
                                                               title={attr.isPII ? t('dataDictionary.piiSensitive') : t('dataDictionary.piiMark')}
                                                           >
                                                              <Lock size={14} />
                                                          </button>
                                                     </div>

                                                     <div className="relative w-1/2 flex items-center">
                                                         <div className="flex-1">
                                                          <input
                                                              className="h-8 px-2.5 block w-full border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-mono font-bold bg-white dark:bg-neutral-950 text-gray-700 dark:text-neutral-200 focus:border-blue-500 focus:ring-blue-500 transition-all shadow-sm"
                                                              value={attr.name}
                                                              placeholder={t('dataDictionary.attributeNamePlaceholder')}
                                                              onChange={(e) => handleUpdateAttribute(def, index, 'name', e.target.value)}
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
                                                              onChange={(val) => handleUpdateAttribute(def, index, 'type', val)}
                                                              buttonClassName="h-8 py-0 px-2.5 text-xs font-mono font-bold"
                                                          />
                                                      </div>

                                                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                                          <button
                                                              onClick={() => handleDeleteAttribute(def, index)}
                                                              className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                                                          >
                                                              <X size={14} />
                                                          </button>
                                                      </div>
                                                 </div>
                                             </div>
                                          ))}
                                         {(def.attributes || []).length === 0 && (
                                             <p className="text-center text-xs text-gray-400 italic py-2">{t('dataDictionary.noAttributes')}</p>
                                         )}
                                     </div>
                                 </div>
                            </div>
                        </details>
                    );
                })}

                 {definitions.length === 0 && (
                     <p className="text-center text-gray-400 pt-8 italic">{t('dataDictionary.noDefinitions')}</p>
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
