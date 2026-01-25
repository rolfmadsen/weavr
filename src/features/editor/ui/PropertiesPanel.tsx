import React, { useEffect, useMemo } from 'react';
import { Trash2, Pin, PinOff, CircleHelp, Info } from 'lucide-react';
import { Node, Link, Slice, DataDefinition, DefinitionType, ElementType } from '../../modeling';
import SmartSelect from '../../../shared/components/SmartSelect';
import { useCrossModelData } from '../../modeling';
import { useModelingContext } from '../../modeling/store/ModelingContext';
import { GlassButton } from '../../../shared/components/GlassButton';
import { GlassInput } from '../../../shared/components/GlassInput';
import * as Tooltip from '@radix-ui/react-tooltip';

// Helper for Glass Tooltip
const GlassTooltip = ({ children, content }: { children: React.ReactNode, content: React.ReactNode }) => (
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className="cursor-help inline-flex items-center">{children}</span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="z-[100] max-w-xs p-3 text-sm text-slate-100 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200" sideOffset={5}>
          {content}
          <Tooltip.Arrow className="fill-slate-900/90" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);

const ELEMENT_DESCRIPTIONS: Partial<Record<ElementType, { title: string; purpose: string; story: string; tech: string }>> = {
  [ElementType.Screen]: {
    title: 'User Interface / Screen',
    purpose: 'Visualizes the current state for the user.',
    story: 'The "Scene". It displays information derived from past events (via Projections) and offers controls to trigger new actions (Commands).',
    tech: 'Presentation Layer. The "Where" of the interaction.'
  },
  [ElementType.Command]: {
    title: 'Command',
    purpose: 'An intent to change the system state.',
    story: 'The "Attempt". You are asking the system to do something. Before saying "Yes", the system builds a Decision Model to check if this is allowed.',
    tech: 'Input / Request. Targeting specific Tags (Consistency Boundary) to validate Invariants.'
  },
  [ElementType.DomainEvent]: {
    title: 'Domain Event',
    purpose: 'A fact that definitely happened.',
    story: 'The "History". If this exists, it means the Command was accepted and all business rules (Decision Model) passed. It cannot be rejected or changed later.',
    tech: 'Immutable Fact. The basis for all State (Projections).'
  },
  [ElementType.ReadModel]: {
    title: 'Read Model / Projection',
    purpose: 'Translates event history into useful state.',
    story: 'The "Translation". Events are just a list of what happened. This component translates that raw list into a specific shape—either for the UI (Read Model) or to check rules (Decision Model).',
    tech: 'Projection (f(state, event) => state). Derived Data.'
  },
  [ElementType.IntegrationEvent]: {
    title: 'Integration Event',
    purpose: 'Connecting with the outside world.',
    story: 'A signal, typically a message with an id, that something happened in another boundary (like a Payment Provider) that we need to react to.',
    tech: 'External / Public Event. Cross-Context communication.'
  },
  [ElementType.Automation]: {
    title: 'Automation',
    purpose: 'System-triggered actions.',
    story: 'The "Robot". It watches for specific Events (facts) and automatically triggers a new Command (intent) to keep a process moving.',
    tech: 'Process Manager. Side-effect trigger.'
  }
};

const ElementHelp: React.FC<{ type: ElementType }> = ({ type }) => {
  const info = ELEMENT_DESCRIPTIONS[type];
  if (!info) return null;

  return (
    <div className="mt-4 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-sm">
      <div className="flex gap-2 items-center mb-3 text-purple-600 dark:text-purple-400">
        <Info size={16} />
        <span className="font-bold">{info.title}</span>
      </div>

      <div className="mb-3">
        <span className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Role</span>
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{info.purpose}</p>
      </div>

      <div className="mb-3">
        <span className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">The Story</span>
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{info.story}</p>
      </div>

      <div>
        <span className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Technical Meaning</span>
        <code className="text-xs bg-slate-200 dark:bg-black/30 px-1 py-0.5 rounded text-amber-700 dark:text-amber-200 block w-full overflow-x-auto">{info.tech}</code>
      </div>
    </div>
  );
};

interface PropertiesPanelProps {
  focusOnRender?: boolean;
  onFocusHandled?: () => void;
  modelId: string | null;
}

interface NodePropertiesProps {
  node: Node;
  onUpdateNode: <K extends keyof Node>(id: string, key: K, value: Node[K]) => void;
  onDeleteNode: (id: string) => void;
  slices: Slice[];
  onAddSlice: (title: string) => string;
  definitions: DataDefinition[];
  onAddDefinition: (def: Omit<DataDefinition, 'id'>) => string;
  crossModelSlices: any[];
  crossModelDefinitions: any[];
  nameInputRef: React.RefObject<HTMLInputElement | null>;
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
  nameInputRef
}) => {
  // Slice Options
  const sliceOptions = useMemo(() => {
    const localOptions = slices.map((s) => ({
      id: s.id,
      label: s.title || 'Untitled',
      color: s.color,
      group: 'Local Slices'
    }));

    const remoteOptions = crossModelSlices.map((s: any) => ({
      id: `remote:${s.id}:${s.label}`, // Unique ID for remote
      label: s.label,
      subLabel: `From ${s.modelName}`,
      group: 'Suggestions',
      originalData: s
    }));

    return [...localOptions, ...remoteOptions];
  }, [slices, crossModelSlices]);

  // Entity Options
  const entityOptions = useMemo(() => {
    const currentIds = node.entityIds || [];
    const localOptions = definitions
      .filter((d) => !currentIds.includes(d.id))
      .map((d) => ({
        id: d.id,
        label: d.name,
        subLabel: d.type,
        group: 'Local Entities'
      }));

    const remoteOptions = crossModelDefinitions.map((d: any) => ({
      id: `remote:${d.id}:${d.label}`,
      label: d.label,
      subLabel: `From ${d.modelName}`,
      group: 'Suggestions',
      originalData: d
    }));

    return [...localOptions, ...remoteOptions];
  }, [definitions, crossModelDefinitions, node.entityIds]);


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
      const remoteSlice = option.originalData;
      const existingLocal = slices.find((s: any) => (s.title || '').toLowerCase() === remoteSlice.label.toLowerCase());
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

  const handleEntityCreate = (name: string) => {
    const existingDef = definitions.find((d: any) => d.name.toLowerCase() === name.toLowerCase());
    if (existingDef) return existingDef.id;
    const newId = onAddDefinition({
      name: name,
      type: DefinitionType.Entity,
      description: '',
      attributes: []
    });
    return newId;
  };

  const handleEntityAdd = (id: string, option: any) => {
    if (!id) return;
    const safeIds = (() => {
      const eIds = node.entityIds;
      if (Array.isArray(eIds)) return eIds;
      if (typeof eIds === 'string') {
        try { return JSON.parse(eIds); } catch { return []; }
      }
      return [];
    })();
    const currentIds: string[] = safeIds;

    if (id.startsWith('remote:') && option?.originalData) {
      const remoteDef = option.originalData;
      const existingLocal = definitions.find((d: any) => d.name.toLowerCase() === remoteDef.label.toLowerCase());
      if (existingLocal) {
        if (!currentIds.includes(existingLocal.id)) {
          onUpdateNode(node.id, 'entityIds', [...currentIds, existingLocal.id]);
        }
      } else {
        const data = remoteDef.originalData;
        const newId = onAddDefinition({
          name: remoteDef.label,
          type: data.type || DefinitionType.Entity,
          description: data.description,
          attributes: data.attributes || []
        });
        onUpdateNode(node.id, 'entityIds', [...currentIds, newId]);
      }
      return;
    }

    if (!currentIds.includes(id)) {
      onUpdateNode(node.id, 'entityIds', [...currentIds, id]);
    }
  };

  const handleEntityRemove = (idToRemove: string) => {
    const safeIds = (() => {
      const eIds = node.entityIds;
      if (Array.isArray(eIds)) return eIds;
      if (typeof eIds === 'string') {
        try { return JSON.parse(eIds); } catch { return []; }
      }
      return [];
    })();
    onUpdateNode(node.id, 'entityIds', safeIds.filter((id: string) => id !== idToRemove));
  };


  return (
    <div className="flex flex-col gap-6">
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
            value={node.name || ''}
            onChange={(e) => onUpdateNode(node.id, 'name', e.target.value)}
            ref={nameInputRef}
            autoComplete="off"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Description</label>
            <textarea
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none transition-all duration-200 text-slate-800 dark:text-slate-100 placeholder-slate-500 backdrop-blur-md focus:ring-2 focus:ring-purple-500/50 min-h-[80px]"
              value={node.description || ''}
              onChange={(e) => onUpdateNode(node.id, 'description', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Type</label>
            <select
              disabled
              value={node.type}
              className="w-full bg-slate-100/50 dark:bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-slate-500 appearance-none cursor-not-allowed"
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
              value={node.type === 'DOMAIN_EVENT' ? 'INTERNAL' : (node.context || 'INTERNAL')}
              onChange={(e) => onUpdateNode(node.id, 'context', e.target.value as any)}
              disabled={node.type === 'DOMAIN_EVENT'}
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 outline-none text-slate-800 dark:text-slate-100"
            >
              <option value="INTERNAL">Internal</option>
              <option value="EXTERNAL">External</option>
            </select>
          </div>

          <GlassInput
            label={node.context === 'EXTERNAL' ? "External Provider Name" : "Service / Microservice"}
            value={node.service || ''}
            onChange={(e) => onUpdateNode(node.id, 'service', e.target.value)}
            placeholder={node.context === 'EXTERNAL' ? "e.g. Stripe, Auth0" : "e.g. Sales-Service"}
          />

          {node.type === 'COMMAND' && (
            <GlassInput
              label="Aggregate (Tags)"
              value={node.aggregate || ''}
              onChange={(e) => onUpdateNode(node.id, 'aggregate', e.target.value)}
              placeholder="e.g. course:c1"
            />
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

        <div className="mb-4">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">Linked Entities</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(() => {
              const eIds = node.entityIds || [];
              const safeIds = Array.isArray(eIds) ? eIds : (typeof eIds === 'string' ? JSON.parse(eIds) : []);

              return safeIds.map((entityId: string) => {
                const def = definitions.find((d: any) => d.id === entityId);
                return (
                  <span key={entityId} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 text-xs font-medium">
                    {def?.name || 'Unknown'}
                    <button onClick={() => handleEntityRemove(entityId)} className="hover:text-purple-800"><Trash2 size={14} /></button>
                  </span>
                );
              })
            })()}
          </div>
          <SmartSelect
            options={entityOptions}
            value=""
            onChange={handleEntityAdd}
            onCreate={handleEntityCreate}
            placeholder="Add entity..."
            allowCustomValue={false}
          />
        </div>
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

interface LinkPropertiesProps {
  link: Link;
  onUpdateLink: <K extends keyof Link>(id: string, key: K, value: Link[K]) => void;
  onDeleteLink: (id: string) => void;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
}

const LinkProperties: React.FC<LinkPropertiesProps> = ({ link, onUpdateLink, onDeleteLink, nameInputRef }) => {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4">Relationship</h3>
        <GlassInput
          label="Label"
          value={link.label || ''}
          onChange={(e) => onUpdateLink(link.id, 'label', e.target.value)}
          ref={nameInputRef}
        />
      </section>

      <div className="h-px bg-slate-200 dark:bg-white/10"></div>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4">Actions</h3>
        <GlassButton
          variant="danger"
          size="sm"
          onClick={() => onDeleteLink(link.id)}
          className="w-full"
        >
          <Trash2 size={16} className="mr-2" /> Delete Link
        </GlassButton>
      </section>
    </div>
  );
};

interface MultiNodePropertiesProps {
  nodes: Node[];
  onUpdateNode: <K extends keyof Node>(id: string, key: K, value: Node[K]) => void;
  onDeleteNode: (id: string) => void;
  slices: Slice[];
  onAddSlice: (title: string) => string;
  crossModelSlices: any[];
  onPinSelection?: () => void;
  onUnpinSelection?: () => void;
}

const MultiNodeProperties: React.FC<MultiNodePropertiesProps> = ({
  nodes,
  onUpdateNode,
  onDeleteNode,
  slices,
  onAddSlice,
  crossModelSlices,
  onPinSelection,
  onUnpinSelection
}) => {
  const sliceOptions = useMemo(() => {
    const localOptions = slices.map((s: any) => ({
      id: s.id,
      label: s.title || 'Untitled',
      color: s.color,
      group: 'Local Slices'
    }));

    const remoteOptions = crossModelSlices.map((s: any) => ({
      id: `remote:${s.id}:${s.label}`,
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
    let targetSliceId = id;
    if (id.startsWith('remote:') && option?.originalData) {
      const remoteSlice = option.originalData;
      const existingLocal = slices.find((s: any) => (s.title || '').toLowerCase() === remoteSlice.label.toLowerCase());
      if (existingLocal) {
        targetSliceId = existingLocal.id;
      } else {
        const newId = onAddSlice(remoteSlice.label);
        targetSliceId = newId.toString();
      }
    }
    nodes.forEach((node) => {
      onUpdateNode(node.id, 'sliceId', targetSliceId || undefined);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="text-md font-bold text-slate-800 dark:text-white mb-1">{nodes.length} items selected</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Edit properties for all selected items.</p>
      </section>

      <div className="h-px bg-slate-200 dark:bg-white/10"></div>

      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4">Batch Actions</h3>

        <div className="grid grid-cols-2 gap-2 mb-6">
          <GlassButton variant="secondary" size="sm" onClick={onPinSelection} disabled={!onPinSelection}>
            <Pin size={16} className="mr-1" /> Pin
          </GlassButton>
          <GlassButton variant="secondary" size="sm" onClick={onUnpinSelection} disabled={!onUnpinSelection}>
            <PinOff size={16} className="mr-1" /> Unpin
          </GlassButton>
        </div>

        <div className="mb-6">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Assign to Slice</label>
          <SmartSelect
            options={sliceOptions}
            value=""
            onChange={handleSliceChange}
            onCreate={handleSliceCreate}
            placeholder="Select slice for all..."
            allowCustomValue={false}
          />
        </div>

        <GlassButton variant="danger" onClick={() => nodes.forEach((n) => onDeleteNode(n.id))} className="w-full">
          <Trash2 size={16} className="mr-2" /> Delete All Selected
        </GlassButton>
      </section>
    </div>
  );
};

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  focusOnRender,
  onFocusHandled,
  modelId
}) => {
  const store = useModelingContext();
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  const {
    crossModelSlices,
    crossModelDefinitions,
  } = useCrossModelData(modelId);

  const selectedItem = useMemo(() => {
    if (!store) return null;
    const { nodes, links, selectedNodeIdsArray, selectedLinkId } = store;

    if (selectedNodeIdsArray.length === 1 && !selectedLinkId) {
      const node = nodes.find((n: Node) => n.id === selectedNodeIdsArray[0]);
      return node ? { type: 'node' as const, data: node } : null;
    }
    if (selectedNodeIdsArray.length > 1 && !selectedLinkId) {
      const selectedNodes = nodes.filter((n: Node) => selectedNodeIdsArray.includes(n.id));
      return { type: 'multi-node' as const, data: selectedNodes };
    }
    if (selectedLinkId && selectedNodeIdsArray.length === 0) {
      const link = links.find((l: Link) => l.id === selectedLinkId);
      return link ? { type: 'link' as const, data: link } : null;
    }
    return null;
  }, [store]);

  useEffect(() => {
    if (focusOnRender && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
      onFocusHandled?.();
    }
  }, [focusOnRender, onFocusHandled, selectedItem]);

  if (!store || !selectedItem) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        <p>Select an item to view properties</p>
      </div>
    );
  }

  const onAddSliceWrapper = (title: string) => {
    // @ts-ignore
    return store.handleAddSlice(title) || '';
  }

  const onAddDefinitionWrapper = (def: Omit<DataDefinition, 'id'>) => {
    // @ts-ignore
    return store.addDefinition(def) || '';
  }

  if (selectedItem.type === 'node') {
    return (
      <NodeProperties
        node={selectedItem.data}
        onUpdateNode={store.handleUpdateNode}
        onDeleteNode={store.handleDeleteNode}
        slices={store.slices}
        onAddSlice={onAddSliceWrapper}
        definitions={store.definitions}
        onAddDefinition={onAddDefinitionWrapper}
        crossModelSlices={crossModelSlices}
        crossModelDefinitions={crossModelDefinitions}
        nameInputRef={nameInputRef}
      />
    );
  }

  if (selectedItem.type === 'link') {
    return (
      <LinkProperties
        link={selectedItem.data}
        onUpdateLink={store.handleUpdateLink}
        onDeleteLink={store.handleDeleteLink}
        nameInputRef={nameInputRef}
      />
    );
  }

  if (selectedItem.type === 'multi-node') {
    return (
      <MultiNodeProperties
        nodes={selectedItem.data}
        onUpdateNode={store.handleUpdateNode}
        onDeleteNode={store.handleDeleteNode}
        slices={store.slices}
        onAddSlice={onAddSliceWrapper}
        crossModelSlices={crossModelSlices}
        // @ts-ignore
        onPinSelection={store.handlePinSelection}
        // @ts-ignore
        onUnpinSelection={store.handleUnpinSelection}
      />
    );
  }

  return null;
};

export default PropertiesPanel;