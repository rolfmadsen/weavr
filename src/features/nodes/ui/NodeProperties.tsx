import React, { useMemo } from 'react';
import { Pin, PinOff, CircleHelp, Trash2, BadgeAlert } from 'lucide-react';
import { Node, Slice, DataDefinition, DefinitionType, Actor, Link, ElementType } from '../../modeling';
import { CrossModelItem } from '../../modeling/store/useCrossModelData';
import { GlassButton } from '../../../shared/components/GlassButton';
import { GlassInput } from '../../../shared/components/GlassInput';
import SmartSelect from '../../../shared/components/SmartSelect';
import { GlassTooltip } from '../../../shared/components/GlassTooltip';
import { ElementHelp } from './ElementHelp';
import validationService from '../../modeling/domain/validation';
import { SchemaBuilder } from './SchemaBuilder';
import { useDebouncedInput } from '../../../shared/hooks/useDebouncedInput';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

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
    nameInputRef: React.RefObject<HTMLInputElement | null>;
    actors: Actor[];
    onAddActor: (actor: { name: string; description: string; color: string }) => string;
    allNodes: Node[];
    allLinks: Link[];
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
    allLinks
}) => {

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
    const validationResult = useMemo(() => {
        const incomingLinks = allLinks.filter(l => l.target === node.id);
        return validationService.validateCompleteness(node, incomingLinks, allNodes);
    }, [node, allNodes, allLinks]);

    // Aggregate Options
    const aggregateOptions = useMemo(() => {
        const localOptions = definitions
            .filter(d => d.type === DefinitionType.Aggregate)
            .map(a => ({
                id: a.id,
                label: a.name,
                group: 'Local Aggregates',
                color: '#10b981' // Emerald
            }));

        const remoteOptions = crossModelDefinitions
            .filter(d => (d.originalData as any)?.type === DefinitionType.Aggregate)
            .map(d => ({
                id: `remote:${d.id}:${d.label}`,
                label: d.label,
                subLabel: `From ${d.modelName}`,
                group: 'Suggestions',
                color: '#10b981'
            }));

        return [
            { id: '__none__', label: 'No Aggregate', group: 'System', color: '#94a3b8' },
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
            group: 'Actors',
            color: a.color
        }));
        return [
            { id: '__none__', label: 'No Actor', group: 'System', color: '#94a3b8' },
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
            label: s.title || 'Untitled',
            color: s.color,
            group: 'Local Slices'
        }));

        const remoteOptions = crossModelSlices.map((s) => ({
            id: `remote:${s.id}:${s.label}`, // Unique ID for remote
            label: s.label,
            subLabel: `From ${s.modelName}`,
            group: 'Suggestions',
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
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Information Incomplete</p>
                        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 leading-relaxed">
                            {validationResult.message}
                        </p>
                    </div>
                </div>
            )}

            {/* General Section */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">General</h3>
                    <GlassButton
                        size="sm"
                        variant="ghost"
                        onClick={() => onUpdateNode(node.id, 'pinned', !node.pinned)}
                        className={node.pinned ? "text-purple-500 bg-purple-500/10" : ""}
                    >
                        {node.pinned ? <><Pin size={16} className="mr-1" /> Pinned</> : <><PinOff size={16} className="mr-1" /> Pin</>}
                    </GlassButton>
                </div>

                <div className="space-y-4">
                    <GlassInput
                        label="Name"
                        {...nameInputGroup}
                        ref={nameInputRef}
                        autoComplete="off"
                    />

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Description</label>
                        <textarea
                            className="py-2.5 px-4 block w-full border-slate-300 dark:border-white/10 rounded-xl text-sm bg-slate-50/50 dark:bg-black/20 backdrop-blur-md transition-all duration-200 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-purple-500/50 focus:ring-purple-500/50 dark:focus:ring-neutral-600 disabled:opacity-50 disabled:pointer-events-none min-h-[80px]"
                            {...descriptionInputGroup}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Type</label>
                        <select
                            disabled
                            value={node.type}
                            className="py-2.5 px-4 block w-full border-slate-300 dark:border-white/10 rounded-xl text-sm bg-slate-100/50 dark:bg-black/40 text-slate-500 appearance-none cursor-not-allowed opacity-70"
                        >
                            <option value="COMMAND">Command</option>
                            <option value="DOMAIN_EVENT">Domain Event</option>
                            <option value="INTEGRATION_EVENT">Integration Event</option>
                            <option value="READ_MODEL">Read Model</option>
                            <option value="SCREEN">Screen</option>
                            <option value="AUTOMATION">Automation</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1 flex items-center gap-1">
                            Context
                            <GlassTooltip content={
                                <div>
                                    <p className="font-bold mb-1">System Boundary</p>
                                    <p className="mb-2">Where does this happen?</p>
                                    <p className="text-xs mb-1"><strong>Internal</strong>: Part of our system.</p>
                                    <p className="text-xs"><strong>External</strong>: A 3rd-party tool.</p>
                                </div>
                            }>
                                <CircleHelp size={14} />
                            </GlassTooltip>
                        </label>
                        <select
                            value={node.type === ElementType.IntegrationEvent ? (node.context || 'INTERNAL') : 'INTERNAL'}
                            onChange={(e) => onUpdateNode(node.id, 'context', e.target.value as any)}
                            disabled={node.type !== ElementType.IntegrationEvent}
                            className={cn(
                                "py-2.5 px-4 block w-full border-slate-300 dark:border-white/10 rounded-xl text-sm bg-slate-50/50 dark:bg-black/20 backdrop-blur-md transition-all duration-200 text-slate-800 dark:text-slate-100 focus:border-purple-500/50 focus:ring-purple-500/50 dark:focus:ring-neutral-600 disabled:opacity-50 disabled:pointer-events-none",
                                node.type !== ElementType.IntegrationEvent && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            <option value="INTERNAL">Internal</option>
                            <option value="EXTERNAL">External</option>
                        </select>
                    </div>

                    <GlassInput
                        label={node.context === 'EXTERNAL' ? "External Provider Name" : "Component / Service"}
                        {...serviceInputGroup}
                        placeholder={node.context === 'EXTERNAL' ? "e.g. Stripe, Auth0" : "e.g. Sales-Service"}
                        autoComplete="off"
                    />

                    {(node.type === 'SCREEN' || node.type === 'AUTOMATION') && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Actor</label>
                            <SmartSelect
                                options={actorOptions}
                                value={node.actor || '__none__'}
                                onChange={(id) => onUpdateNode(node.id, 'actor', (id === '__none__' || !id) ? undefined : id)}
                                onCreate={handleActorCreate}
                                placeholder="Select or create actor..."
                                allowCustomValue={false}
                            />
                        </div>
                    )}

                    {node.type === 'DOMAIN_EVENT' && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Aggregate</label>
                            <SmartSelect
                                options={aggregateOptions}
                                value={node.aggregate || '__none__'}
                                onChange={(id, opt) => {
                                    if (id && id.startsWith('remote:') && opt?.subLabel) {
                                        // Import remote aggregate
                                        const newId = onAddDefinition({
                                            name: opt.label,
                                            type: DefinitionType.Aggregate,
                                            description: `Imported from ${opt.subLabel}`,
                                            attributes: []
                                        });
                                        onUpdateNode(node.id, 'aggregate', newId);
                                    } else {
                                        onUpdateNode(node.id, 'aggregate', (id === '__none__' || !id) ? undefined : id);
                                    }
                                }}
                                onCreate={handleAggregateCreate}
                                placeholder="Select or create aggregate..."
                                allowCustomValue={false}
                            />
                        </div>
                    )}

                    {node.type === 'COMMAND' && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Aggregate</label>
                            <SmartSelect
                                options={aggregateOptions}
                                value={node.aggregate || '__none__'}
                                onChange={(id, opt) => {
                                    if (id && id.startsWith('remote:') && opt?.subLabel) {
                                        // Import remote aggregate
                                        const newId = onAddDefinition({
                                            name: opt.label,
                                            type: DefinitionType.Aggregate,
                                            description: `Imported from ${opt.subLabel}`,
                                            attributes: []
                                        });
                                        onUpdateNode(node.id, 'aggregate', newId);
                                    } else {
                                        onUpdateNode(node.id, 'aggregate', (id === '__none__' || !id) ? undefined : id);
                                    }
                                }}
                                onCreate={handleAggregateCreate}
                                placeholder="Select or create aggregate..."
                                allowCustomValue={false}
                            />
                        </div>
                    )}
                </div>
            </section>

            <div className="h-px bg-slate-200 dark:bg-white/10"></div>

            {/* Organization Section */}
            <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4">Organization</h3>

                <div className="mb-4">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Slice</label>
                    <SmartSelect
                        options={sliceOptions}
                        value={node.sliceId ? node.sliceId.toString() : ''}
                        onChange={handleSliceChange}
                        onCreate={handleSliceCreate}
                        placeholder="Select or create slice..."
                        allowCustomValue={false}
                    />
                </div>
            </section>

            <div className="h-px bg-slate-200 dark:bg-white/10"></div>

            {/* Schema Section */}
            <section>
                <SchemaBuilder
                    node={node}
                    onUpdateNode={onUpdateNode}
                    definitions={definitions}
                    crossModelDefinitions={crossModelDefinitions}
                    onAddDefinition={onAddDefinition}
                />
            </section>

            <div className="h-px bg-slate-200 dark:bg-white/10"></div>

            {/* Actions Section */}
            <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4">Actions</h3>
                <GlassButton
                    variant="danger"
                    size="sm"
                    onClick={() => onDeleteNode(node.id)}
                    className="w-full"
                >
                    <Trash2 size={16} className="mr-2" /> Delete Node
                </GlassButton>

                <ElementHelp type={node.type} />
            </section>
        </div>
    );
};

export default NodeProperties;
