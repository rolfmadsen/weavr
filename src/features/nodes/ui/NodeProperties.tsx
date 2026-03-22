import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pin, PinOff, Trash2, BadgeAlert } from 'lucide-react';
import { Node, Slice, DataDefinition, DefinitionType, Actor, Link, ElementType } from '../../modeling';
import { CrossModelItem } from '../../modeling/store/useCrossModelData';
import { GlassInput } from '../../../shared/components/GlassInput';
import SmartSelect from '../../../shared/components/SmartSelect';
import { GlassSelect } from '../../../shared/components/GlassSelect';
import { ElementHelp } from './ElementHelp';
import validationService from '../../modeling/domain/validation';
import { useNodeValidation } from '../../modeling/hooks/useNodeValidation';
import { SchemaBuilder } from './SchemaBuilder';
import { useDebouncedInput } from '../../../shared/hooks/useDebouncedInput';
import { Textarea } from '../../../shared/components/ui/textarea';
import { Label } from '../../../shared/components/ui/label';
import { Button } from '../../../shared/components/ui/button';
import { cn } from '../../../shared/lib/utils';


interface NodePropertiesProps {
    node: Node;
    onUpdateNode: <K extends keyof Node>(id: string, key: K, value: Node[K]) => void;
    onDeleteNode: (id: string) => void;
    slices: Slice[];
    onAddSlice: (title: string) => string;
    definitions: DataDefinition[];
    onAddDefinition: (def: Omit<DataDefinition, 'id'>) => string;
    crossModelSlices: CrossModelItem[];
    crossModelDefinitions: CrossModelItem[];
    nameInputRef: React.RefObject<any>;
    actors: Actor[];
    onAddActor: (actor: { name: string; description: string; color: string }) => string;
    allNodes: Node[];
    allLinks: Link[];
    onAddLink: (sourceId: string, targetId: string) => void;
    onDeleteLink: (linkId: string) => void;
    onSpawnAndLink: (sourceNodeId: string, targetType: ElementType, name: string) => void;
}

const NodeProperties: React.FC<NodePropertiesProps> = ({
    node,
    onUpdateNode,
    onDeleteNode,
    slices,
    onAddSlice,
    definitions,
    onAddDefinition,
    crossModelSlices,
    crossModelDefinitions,
    nameInputRef,
    actors,
    onAddActor,
    allNodes,
    allLinks,
    onAddLink,
    onDeleteLink,
    onSpawnAndLink
}) => {
    const { t } = useTranslation();

    const nameInputGroup = useDebouncedInput(
        node.name || '',
        (val) => onUpdateNode(node.id, 'name', val)
    );

    const descriptionInputGroup = useDebouncedInput(
        node.description || '',
        (val) => onUpdateNode(node.id, 'description', val)
    );

    const serviceInputGroup = useDebouncedInput(
        node.service || '',
        (val) => onUpdateNode(node.id, 'service', val)
    );

    // Validation Results
    const validationResult = useNodeValidation(node, allNodes, allLinks);

    // Aggregate Options
    const aggregateOptions = useMemo(() => {
        const localOptions = definitions
            .filter(d => d.type === DefinitionType.Aggregate)
            .map(a => ({
                id: a.id,
                label: a.name,
                group: t('properties.aggregate'),
                color: '#10b981' // Emerald
            }));

        const remoteOptions = crossModelDefinitions
            .filter(d => (d.originalData as any)?.type === DefinitionType.Aggregate)
            .map(d => ({
                id: `remote:${d.id}:${d.label}`,
                label: d.label,
                subLabel: t('modeling.fromModel', { modelName: d.modelName }),
                group: t('common.suggestions'),
                color: '#10b981'
            }));

        return [
            { id: '__none__', label: t('modeling.noAggregate'), group: t('common.system'), color: '#94a3b8' },
            ...localOptions,
            ...remoteOptions
        ];
    }, [definitions, crossModelDefinitions]);

    const handleAggregateCreate = (name: string) => {
        const existing = definitions.find(d => d.type === DefinitionType.Aggregate && d.name.toLowerCase() === name.toLowerCase());
        if (existing) return existing.id;
        return onAddDefinition({
            name,
            type: DefinitionType.Aggregate,
            description: 'Domain Aggregate',
            attributes: []
        });
    };

    // Actor Options
    const actorOptions = useMemo(() => {
        const list = actors.map(a => ({
            id: a.id,
            label: a.name,
            group: t('properties.actors'),
            color: a.color
        }));
        return [
            { id: '__none__', label: t('properties.noActor'), group: t('common.system'), color: '#94a3b8' },
            ...list
        ];
    }, [actors]);

    const handleActorCreate = (name: string) => {
        const existing = actors.find(a => a.name.toLowerCase() === name.toLowerCase());
        if (existing) return existing.id;
        return onAddActor({ name, description: '', color: '#9333ea' });
    };
    // Slice Options
    const sliceOptions = useMemo(() => {
        const localOptions = slices.map((s) => ({
            id: s.id,
            label: s.title || t('common.untitled'),
            color: s.color,
            group: t('properties.slice')
        }));

        const remoteOptions = crossModelSlices.map((s) => ({
            id: `remote:${s.id}:${s.label}`, // Unique ID for remote
            label: s.label,
            subLabel: t('modeling.fromModel', { modelName: s.modelName }),
            group: t('common.suggestions'),
            originalData: s
        }));

        return [...localOptions, ...remoteOptions];
    }, [slices, crossModelSlices]);




    const handleSliceCreate = (name: string) => {
        const existingSlice = slices.find((s: any) => (s.title || '').toLowerCase() === name.toLowerCase());
        if (existingSlice) {
            alert(`Slice "${existingSlice.title}" already exists.`);
            return existingSlice.id;
        }
        const newId = onAddSlice(name);
        return newId.toString();
    };

    const handleSliceChange = (id: string, option: any) => {
        if (!id) {
            onUpdateNode(node.id, 'sliceId', undefined);
            return;
        }
        if (id.startsWith('remote:') && option?.originalData) {
            const remoteSlice = option.originalData as CrossModelItem;
            const existingLocal = slices.find((s) => (s.title || '').toLowerCase() === remoteSlice.label.toLowerCase());
            if (existingLocal) {
                onUpdateNode(node.id, 'sliceId', existingLocal.id);
            } else {
                const newId = onAddSlice(remoteSlice.label);
                onUpdateNode(node.id, 'sliceId', newId.toString());
            }
            return;
        }
        onUpdateNode(node.id, 'sliceId', id);
    };




    return (
        <div className="flex flex-col gap-6">
            {/* Validation Warning */}
            {!validationResult.isValid && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <BadgeAlert className="text-amber-500 shrink-0" size={20} />
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{t('properties.informationIncomplete')}</p>
                        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 leading-relaxed">
                            {validationResult.message}
                        </p>
                    </div>
                </div>
            )}

            {/* General Section */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t('properties.general')}</h3>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onUpdateNode(node.id, 'pinned', !node.pinned)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.stopPropagation();
                            }
                        }}
                        className={cn(
                            "rounded-full transition-all duration-200",
                            node.pinned ? "text-purple-500 bg-purple-500/10 hover:bg-purple-500/20" : "text-slate-600 dark:text-slate-300"
                        )}
                    >
                        {node.pinned ? <><Pin size={16} className="mr-1" /> {t('properties.pinned')}</> : <><PinOff size={16} className="mr-1" /> {t('properties.pin')}</>}
                    </Button>
                </div>

                <div className="space-y-4">
                    <GlassInput
                        label={t('properties.name')}
                        {...nameInputGroup}
                        ref={nameInputRef}
                        autoComplete="off"
                    />

                    <div className="flex flex-col gap-1.5">
                        <Label className="ml-1">{t('properties.description')}</Label>
                        <Textarea
                            className="glass-input min-h-[80px]"
                            {...descriptionInputGroup}
                        />
                    </div>

                    <GlassSelect
                        label={t('properties.type')}
                        disabled
                        value={node.type}
                        options={[
                            { id: 'COMMAND', label: t('modeling.elements.command') },
                            { id: 'DOMAIN_EVENT', label: t('modeling.elements.domainEvent') },
                            { id: 'INTEGRATION_EVENT', label: t('modeling.elements.integrationEvent') },
                            { id: 'READ_MODEL', label: t('modeling.elements.readModel') },
                            { id: 'SCREEN', label: t('modeling.elements.screen') },
                            { id: 'AUTOMATION', label: t('modeling.elements.automation') },
                        ]}
                        onChange={() => {}}
                    />

                    <GlassSelect
                        label={t('properties.context.label')}
                        labelTooltip={
                            <div>
                                <p className="font-bold mb-1">{t('properties.context.tooltip.title')}</p>
                                <p className="mb-2">{t('properties.context.tooltip.question')}</p>
                                <p className="text-xs mb-1"><strong>{t('properties.context.internal')}</strong>: {t('properties.context.tooltip.internalDesc')}</p>
                                <p className="text-xs"><strong>{t('properties.context.external')}</strong>: {t('properties.context.tooltip.externalDesc')}</p>
                            </div>
                        }
                        value={node.type === ElementType.IntegrationEvent ? (node.context || 'INTERNAL') : 'INTERNAL'}
                        onChange={(val) => onUpdateNode(node.id, 'context', val as any)}
                        disabled={node.type !== ElementType.IntegrationEvent}
                        options={[
                            { id: 'INTERNAL', label: t('properties.context.internal') },
                            { id: 'EXTERNAL', label: t('properties.context.external') },
                        ]}
                    />

                    <GlassInput
                        label={node.context === 'EXTERNAL' ? t('properties.context.providerName') : t('properties.context.componentService')}
                        {...serviceInputGroup}
                        placeholder={node.context === 'EXTERNAL' ? t('properties.placeholders.externalProvider') : t('properties.placeholders.componentService')}
                        autoComplete="off"
                    />

                    {(node.type === 'SCREEN' || node.type === 'AUTOMATION') && (
                        <div className="flex flex-col gap-1.5">
                            <Label className="ml-1">{t('properties.actor')}</Label>
                            <SmartSelect
                                options={actorOptions}
                                value={node.actor || '__none__'}
                                onChange={(id: string) => onUpdateNode(node.id, 'actor', (id === '__none__' || !id) ? undefined : id)}
                                onCreate={handleActorCreate}
                                placeholder={t('properties.placeholders.selectOrCreateActor')}
                                allowCustomValue={false}
                            />
                        </div>
                    )}

                    {node.type === 'DOMAIN_EVENT' && (
                        <div className="flex flex-col gap-1.5">
                            <Label className="ml-1">{t('properties.aggregate')}</Label>
                            <SmartSelect
                                options={aggregateOptions}
                                value={node.aggregate || '__none__'}
                                onChange={(id: string, opt?: any) => {
                                    if (id && id.startsWith('remote:') && opt?.subLabel) {
                                        // Import remote aggregate
                                        const newId = onAddDefinition({
                                            name: opt.label,
                                            type: DefinitionType.Aggregate,
                                            description: t('modeling.importedFrom', { modelName: opt.subLabel }),
                                            attributes: []
                                        });
                                        onUpdateNode(node.id, 'aggregate', newId);
                                    } else {
                                        onUpdateNode(node.id, 'aggregate', (id === '__none__' || !id) ? undefined : id);
                                    }
                                }}
                                onCreate={handleAggregateCreate}
                                placeholder={t('properties.placeholders.selectOrCreateAggregate')}
                                allowCustomValue={false}
                            />
                        </div>
                    )}

                    {node.type === 'COMMAND' && (
                        <div className="flex flex-col gap-1.5">
                            <Label className="ml-1">{t('properties.aggregate')}</Label>
                            <SmartSelect
                                options={aggregateOptions}
                                value={node.aggregate || '__none__'}
                                onChange={(id: string, opt?: any) => {
                                    if (id && id.startsWith('remote:') && opt?.subLabel) {
                                        // Import remote aggregate
                                        const newId = onAddDefinition({
                                            name: opt.label,
                                            type: DefinitionType.Aggregate,
                                            description: t('modeling.importedFrom', { modelName: opt.subLabel }),
                                            attributes: []
                                        });
                                        onUpdateNode(node.id, 'aggregate', newId);
                                    } else {
                                        onUpdateNode(node.id, 'aggregate', (id === '__none__' || !id) ? undefined : id);
                                    }
                                }}
                                onCreate={handleAggregateCreate}
                                placeholder={t('properties.placeholders.selectOrCreateAggregate')}
                                allowCustomValue={false}
                            />
                        </div>
                    )}
                </div>
            </section>

            <div className="h-px bg-gray-200 dark:bg-neutral-700"></div>

            {/* Organization Section */}
            <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">{t('properties.organization')}</h3>

                <div className="mb-4">
                    <Label className="mb-2 block">{t('properties.slice')}</Label>
                    <SmartSelect
                        options={sliceOptions}
                        value={node.sliceId ? node.sliceId.toString() : ''}
                        onChange={handleSliceChange}
                        onCreate={handleSliceCreate}
                        placeholder={t('properties.placeholders.selectOrCreateSlice')}
                        allowCustomValue={false}
                    />
                </div>
            </section>

            <div className="h-px bg-gray-200 dark:bg-neutral-700"></div>

             {/* Relationships Section */}
            <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">{t('properties.relationships')}</h3>
                <div className="space-y-6">
                    {validationService.getRules()
                        .filter(rule => rule.source === node.type)
                        .map(rule => {
                            const connectedNodes = allNodes.filter(n =>
                                n.type === rule.target &&
                                allLinks.some(l => l.source === node.id && l.target === n.id)
                            );

                            const targetOptions = allNodes
                                .filter(n => n.type === rule.target && !connectedNodes.some(cn => cn.id === n.id))
                                .map(n => ({
                                    id: n.id,
                                    label: n.name,
                                    group: t('common.existingNodes')
                                }));

                            const rawVerb = rule.verb;
                            const translatedVerb = t(`modeling.verbs.${rawVerb}`, rawVerb);
                            const verb = translatedVerb.charAt(0).toUpperCase() + translatedVerb.slice(1);
                            const target = t(`modeling.elements.${rule.target.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`);

                            return (
                                <div key={`${rule.source}-${rule.target}`} className="space-y-2">
                                    <Label className="mb-2 block">
                                        {verb} ({target})
                                    </Label>

                                    {connectedNodes.length > 0 && (
                                        <div className="space-y-1 mb-2">
                                            {connectedNodes.map(cn => (
                                                <div key={cn.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-neutral-800/50 group">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onUpdateNode(cn.id, 'id', cn.id)} // Dummy to trigger focus/select if needed
                                                        className="text-sm text-gray-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 truncate text-left flex-1 h-auto py-1 px-2 justify-start font-normal"
                                                    >
                                                        {cn.name}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-xs"
                                                        onClick={() => {
                                                            const link = allLinks.find(l => l.source === node.id && l.target === cn.id);
                                                            if (link) {
                                                                onDeleteLink(link.id);
                                                            }
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                                        title={t('common.unpin')}
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <SmartSelect
                                        options={targetOptions}
                                        value=""
                                        onChange={(id: string) => {
                                            if (id) {
                                                onAddLink(node.id, id);
                                            }
                                        }}
                                        onCreate={(name: string) => {
                                            onSpawnAndLink(node.id, rule.target, name);
                                        }}
                                        placeholder={t('properties.placeholders.addType', { type: target })}
                                        allowCustomValue={false}
                                        data-relationship-type={rule.target}
                                        className="relationship-smart-select"
                                    />
                                </div>
                            );
                        })}
                </div>
            </section>

            <div className="h-px bg-gray-200 dark:bg-neutral-700"></div>

            {/* Schema Section */}
            <section>
                <SchemaBuilder
                    node={node}
                    onUpdateNode={onUpdateNode}
                    definitions={definitions}
                    allNodes={allNodes}
                    allLinks={allLinks}
                    onAddDefinition={onAddDefinition}
                />
            </section>

            <div className="h-px bg-gray-200 dark:bg-neutral-700"></div>

            {/* Actions Section */}
            <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">{t('properties.actions')}</h3>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeleteNode(node.id)}
                    className="w-full"
                >
                    <Trash2 size={16} className="mr-2" /> {t('properties.deleteNode')}
                </Button>

                <ElementHelp type={node.type} />
            </section>
        </div>
    );
};

export default NodeProperties;
