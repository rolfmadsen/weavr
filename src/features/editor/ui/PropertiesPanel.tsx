import React, { useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Divider,
  Chip,
  Stack,
  Tooltip,
  InputAdornment
} from '@mui/material';
import { Delete as DeleteIcon, PushPin as PinIcon, PushPinOutlined as UnpinIcon, HelpOutline } from '@mui/icons-material';
import { Node, Link, Slice, DataDefinition, DefinitionType, ElementType } from '../../modeling';
import SmartSelect from '../../../shared/components/SmartSelect';
import { useCrossModelData } from '../../modeling';

import { InfoOutlined } from '@mui/icons-material';

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
    <Box sx={{
      mt: 2,
      p: 2,
      backgroundColor: 'action.hover',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1,
      fontSize: '0.875rem'
    }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
        <InfoOutlined color="primary" fontSize="small" />
        <Typography variant="subtitle2" component="div" fontWeight="bold">
          {info.title}
        </Typography>
      </Box>

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" display="block" color="text.secondary" fontWeight="bold" sx={{ mb: 0.5 }}>Role</Typography>
        <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{info.purpose}</Typography>
      </Box>

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" display="block" color="text.secondary" fontWeight="bold" sx={{ mb: 0.5 }}>The Story</Typography>
        <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{info.story}</Typography>
      </Box>

      <Box>
        <Typography variant="caption" display="block" color="text.secondary" fontWeight="bold" sx={{ mb: 0.5 }}>Technical Meaning</Typography>
        <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>{info.tech}</Typography>
      </Box>
    </Box>
  );
};


import { useModelingContext } from '../../modeling/store/ModelingContext';

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
    // Check for existing local slice (case-insensitive)
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

    // Handle Remote Slice Selection
    if (id.startsWith('remote:') && option?.originalData) {
      const remoteSlice = option.originalData;
      // Check if we already have a local slice with this name
      const existingLocal = slices.find((s: any) => (s.title || '').toLowerCase() === remoteSlice.label.toLowerCase());

      if (existingLocal) {
        onUpdateNode(node.id, 'sliceId', existingLocal.id);
      } else {
        // Create new local slice from remote
        const newId = onAddSlice(remoteSlice.label);
        onUpdateNode(node.id, 'sliceId', newId.toString());
      }
      return;
    }

    onUpdateNode(node.id, 'sliceId', id);
  };

  const handleEntityCreate = (name: string) => {
    // Check for existing local definition
    const existingDef = definitions.find((d: any) => d.name.toLowerCase() === name.toLowerCase());
    if (existingDef) {
      return existingDef.id;
    }

    const newId = onAddDefinition({
      name: name,
      type: DefinitionType.Entity, // Default type
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

    // Handle Remote Entity Selection
    if (id.startsWith('remote:') && option?.originalData) {
      const remoteDef = option.originalData;
      const existingLocal = definitions.find((d: any) => d.name.toLowerCase() === remoteDef.label.toLowerCase());

      if (existingLocal) {
        if (!currentIds.includes(existingLocal.id)) {
          onUpdateNode(node.id, 'entityIds', [...currentIds, existingLocal.id]);
        }
      } else {
        // Copy remote definition to local
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="overline" color="text.secondary">General</Typography>
          <Button
            size="small"
            startIcon={node.pinned ? <PinIcon sx={{ fontSize: 16 }} /> : <UnpinIcon sx={{ fontSize: 16 }} />}
            onClick={() => onUpdateNode(node.id, 'pinned', !node.pinned)}
            color={node.pinned ? "primary" : "inherit"}
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
          >
            {node.pinned ? 'Pinned' : 'Unpinned'}
          </Button>
        </Box>
        <TextField
          label="Name"
          value={node.name || ''}
          onChange={(e) => onUpdateNode(node.id, 'name', e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          inputRef={nameInputRef}
          onKeyDown={(e) => {
            if (e.key === 'Escape') return;
            e.stopPropagation();
          }}
        />
        <TextField
          label="Description"
          value={node.description || ''}
          onChange={(e) => onUpdateNode(node.id, 'description', e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          multiline
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Escape') return;
            e.stopPropagation();
          }}
        />

        <FormControl fullWidth margin="normal" size="small">
          <InputLabel>Type</InputLabel>
          <Select
            value={node.type}
            label="Type"
            onChange={(e) => onUpdateNode(node.id, 'type', e.target.value)}
            inputProps={{ tabIndex: -1 }}
            disabled
          >
            <MenuItem value="COMMAND">Command</MenuItem>
            <MenuItem value="DOMAIN_EVENT">Domain Event</MenuItem>
            <MenuItem value="INTEGRATION_EVENT">Integration Event</MenuItem>
            <MenuItem value="AGGREGATE">Aggregate</MenuItem>
            <MenuItem value="READ_MODEL">Read Model</MenuItem>
            <MenuItem value="SCREEN">Screen</MenuItem>
            <MenuItem value="AUTOMATION">Automation</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth margin="normal" size="small">
          <InputLabel id="context-label" sx={{ display: 'flex', alignItems: 'center' }}>
            Context
            <Tooltip title={
              <Box sx={{ p: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>System Boundary</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>Where does this happen?</Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Internal:</strong> Part of the system we are building.</Typography>
                <Typography variant="body2"><strong>External:</strong> A 3rd-party tool (e.g., Stripe) or another team's system.</Typography>
              </Box>
            } placement="right">
              <HelpOutline sx={{ fontSize: 16, ml: 0.5, cursor: 'help' }} />
            </Tooltip>
          </InputLabel>
          <Select
            labelId="context-label"
            value={node.type === 'DOMAIN_EVENT' ? 'INTERNAL' : (node.context || 'INTERNAL')}
            label={<Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>Context <Box component="span" sx={{ width: 24 }} /></Box>}
            onChange={(e) => onUpdateNode(node.id, 'context', e.target.value as 'INTERNAL' | 'EXTERNAL')}
            disabled={node.type === 'DOMAIN_EVENT'}
          >
            <MenuItem value="INTERNAL">Internal</MenuItem>
            <MenuItem value="EXTERNAL">External</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label={node.context === 'EXTERNAL' ? "External Provider Name" : "Service / Microservice"}
          value={node.service || ''}
          onChange={(e) => onUpdateNode(node.id, 'service', e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          placeholder={node.context === 'EXTERNAL' ? "e.g. Stripe, Auth0" : "e.g. Sales-Service"}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>The "Owner"</Typography>
                    <Typography variant="body2">
                      The specific application, deployable unit, or 3rd party system that handles this logic.
                    </Typography>
                  </Box>
                } arrow placement="left">
                  <HelpOutline fontSize="small" color="action" sx={{ cursor: 'help' }} />
                </Tooltip>
              </InputAdornment>
            )
          }}
        />

        {node.type === 'COMMAND' && (
          <TextField
            label="Aggregate (Tags)"
            value={node.aggregate || ''}
            onChange={(e) => onUpdateNode(node.id, 'aggregate', e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            placeholder="e.g. course:c1"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={
                    <Box sx={{ p: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Consistency Boundary (Tags)</Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Who or What is being affected? (e.g. <code>course:123</code>)
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ color: 'grey.400' }}>
                        This defines the <strong>Decision Model</strong>. We only check business rules against events that share these Tags.
                      </Typography>
                    </Box>
                  } arrow placement="left">
                    <HelpOutline fontSize="small" color="action" sx={{ cursor: 'help' }} />
                  </Tooltip>
                </InputAdornment>
              )
            }}
          />
        )}
      </Box>

      <Divider />

      <Box>
        <Typography variant="overline" color="text.secondary">Organization</Typography>

        <Box sx={{ mt: 2, mb: 3 }}>
          <Typography variant="caption" display="block" gutterBottom>Slice</Typography>
          <SmartSelect
            options={sliceOptions}
            value={node.sliceId ? node.sliceId.toString() : ''}
            onChange={handleSliceChange}
            onCreate={handleSliceCreate}
            placeholder="Select or create slice..."
            allowCustomValue={false}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" display="block" gutterBottom>Linked Entities</Typography>

          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
            {(() => {
              const eIds = node.entityIds;
              const safeIds = Array.isArray(eIds)
                ? eIds
                : (typeof eIds === 'string'
                  ? (() => { try { return JSON.parse(eIds); } catch { return []; } })()
                  : []);

              return (safeIds || []).map((entityId: string) => {
                const def = definitions.find((d: any) => d.id === entityId);
                return (
                  <Chip
                    key={entityId}
                    label={def?.name || 'Unknown'}
                    onDelete={() => handleEntityRemove(entityId)}
                    size="small"
                  />
                );
              })
            })()}
          </Stack>

          <SmartSelect
            options={entityOptions}
            value="" // Always empty as we add to the list
            onChange={handleEntityAdd}
            onCreate={handleEntityCreate}
            placeholder="Add entity..."
            allowCustomValue={false}
          />
        </Box>
      </Box>

      <Divider />

      <Box>
        <Typography variant="overline" color="text.secondary">Actions</Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => onDeleteNode(node.id)}
          fullWidth
          sx={{ mt: 1 }}
        >
          Delete Node
        </Button>

        <Divider sx={{ my: 2 }} />

        <Box>
          <ElementHelp type={node.type} />
        </Box>
      </Box>
    </Box >
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="overline" color="text.secondary">Relationship</Typography>
        <TextField
          label="Label"
          value={link.label || ''}
          onChange={(e) => onUpdateLink(link.id, 'label', e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          inputRef={nameInputRef}
          onKeyDown={(e) => {
            if (e.key === 'Escape') return;
            e.stopPropagation();
          }}
        />
      </Box>

      <Divider />

      <Box>
        <Typography variant="overline" color="text.secondary">Actions</Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => onDeleteLink(link.id)}
          fullWidth
          sx={{ mt: 1 }}
        >
          Delete Link
        </Button>
      </Box>
    </Box>
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
  // Slice Options (Same as single node)
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

    // Update all selected nodes
    nodes.forEach((node) => {
      onUpdateNode(node.id, 'sliceId', targetSliceId || undefined);
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6">{nodes.length} items selected</Typography>
        <Typography variant="body2" color="text.secondary">
          Edit properties for all selected items.
        </Typography>
      </Box>

      <Divider />

      <Box>
        <Typography variant="overline" color="text.secondary">Batch Actions</Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PinIcon />}
            onClick={onPinSelection}
            disabled={!onPinSelection}
            fullWidth
            size="small"
          >
            Pin
          </Button>
          <Button
            variant="outlined"
            startIcon={<UnpinIcon />}
            onClick={onUnpinSelection}
            disabled={!onUnpinSelection}
            fullWidth
            size="small"
          >
            Unpin
          </Button>
        </Stack>

        <Box sx={{ mt: 2, mb: 3 }}>
          <Typography variant="caption" display="block" gutterBottom>Assign to Slice</Typography>
          <SmartSelect
            options={sliceOptions}
            value="" // Always empty for batch actions initially
            onChange={handleSliceChange}
            onCreate={handleSliceCreate}
            placeholder="Select slice for all..."
            allowCustomValue={false}
          />
        </Box>

        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => nodes.forEach((n) => onDeleteNode(n.id))}
          fullWidth
        >
          Delete All Selected
        </Button>
      </Box>
    </Box>
  );
};

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  focusOnRender,
  onFocusHandled,
  modelId
}) => {
  const store = useModelingContext();
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  // Cross-model data
  const {
    crossModelSlices,
    crossModelDefinitions,
  } = useCrossModelData(modelId);

  // Derived Selection State
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
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography>Select an item to view properties</Typography>
      </Box>
    );
  }

  // Helper wrapper for addSlice until types are perfect
  const onAddSliceWrapper = (title: string) => {
    // @ts-ignore
    return store.handleAddSlice(title) || '';
  }

  // Helper wrapper for addDefinition
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