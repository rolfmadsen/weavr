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
  Stack
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { Node, Link, Slice, DataDefinition, DefinitionType, ElementType } from '../../modeling';
import SmartSelect from '../../../shared/components/SmartSelect';
import { useCrossModelData } from '../../modeling';

import { InfoOutlined } from '@mui/icons-material';

const ELEMENT_DESCRIPTIONS: Partial<Record<ElementType, { title: string; purpose: string; uses: string }>> = {
  [ElementType.Screen]: {
    title: 'User Interface (Screen/Mockup)',
    purpose: 'Visualizes how users interact with the system or view information.',
    uses: 'Shows where commands originate (e.g., button clicks) and where read models are displayed. Helps clarify data requirements and user flow.'
  },
  [ElementType.Command]: {
    title: 'Command',
    purpose: 'Represents an intention or instruction for the system to perform an action.',
    uses: 'Triggered by user interaction (via a User Interface) or an Automation. A successful command results in one or more Events.'
  },
  [ElementType.DomainEvent]: {
    title: 'Domain Event',
    purpose: 'Represents a significant fact that has occurred in the system and resulted in persisted data. Written in the past tense.',
    uses: 'Forms the system\'s history and source of truth. Events are used to build Read Models and can trigger Automations.'
  },
  [ElementType.ReadModel]: {
    title: 'Read Model / Query',
    purpose: 'Represents a specific query or view of the system\'s state, derived from past Events.',
    uses: 'Provides the data needed to populate a User Interface or feed information into an Automation. Defines how data is presented or accessed.'
  },
  [ElementType.IntegrationEvent]: {
    title: 'Integration Event (External Event)',
    purpose: 'Represents a point of integration with external systems or other slices.',
    uses: 'Used for both *Incoming* data (feeding Read Models or Automations) and *Outgoing* data (exposed from the slice via Commands or Read Models).'
  },
  [ElementType.Automation]: {
    title: 'Automation',
    purpose: 'Represents an automated background process or job (not a direct user action).',
    uses: 'Is triggered by an Event (Internal or External). It queries a Read Model (optional) for data and issues a Command to complete its task.'
  }
};

const ElementHelp: React.FC<{ type: ElementType }> = ({ type }) => {
  const info = ELEMENT_DESCRIPTIONS[type];
  if (!info) return null;

  return (
    <Box sx={{
      mt: 2,
      p: 2,
      backgroundColor: 'info.light',
      color: 'info.contrastText',
      borderRadius: 1,
      fontSize: '0.875rem',
      opacity: 0.95
    }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
        <InfoOutlined fontSize="small" />
        <Typography variant="subtitle2" component="div" fontWeight="bold">
          {info.title}
        </Typography>
      </Box>

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" display="block" fontWeight="bold" sx={{ mb: 0.5 }}>Purpose</Typography>
        <Typography variant="caption" display="block" sx={{ lineHeight: 1.5 }}>{info.purpose}</Typography>
      </Box>

      <Box>
        <Typography variant="caption" display="block" fontWeight="bold" sx={{ mb: 0.5 }}>Uses</Typography>
        <Typography variant="caption" display="block" sx={{ lineHeight: 1.5 }}>{info.uses}</Typography>
      </Box>
    </Box>
  );
};


interface PropertiesPanelProps {
  selectedItem: { type: 'node' | 'link' | 'multi-node'; data: any } | null;
  onUpdateNode: (id: string, key: string, value: any) => void;
  onUpdateLink: (id: string, key: string, value: any) => void;

  onDeleteLink: (id: string) => void;
  onDeleteNode: (id: string) => void;
  slices: Slice[];
  onAddSlice: (title: string) => string;
  focusOnRender?: boolean;
  onFocusHandled?: () => void;
  definitions: DataDefinition[];
  onAddDefinition: (def: Omit<DataDefinition, 'id'>) => string;
  modelId: string | null;
}

interface NodePropertiesProps {
  node: Node;
  onUpdateNode: (id: string, key: string, value: any) => void;
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
    const localOptions = slices.map((s: any) => ({
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
      .filter((d: any) => !currentIds.includes(d.id))
      .map((d: any) => ({
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

    const currentIds = node.entityIds || [];

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
    const currentIds = node.entityIds || [];
    onUpdateNode(node.id, 'entityIds', currentIds.filter((id: string) => id !== idToRemove));
  };


  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="overline" color="text.secondary">General</Typography>
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

        <TextField
          label="Service / App"
          value={node.service || ''}
          onChange={(e) => onUpdateNode(node.id, 'service', e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          placeholder="e.g. IdentityService"
        />

        {node.type === 'COMMAND' && (
          <TextField
            label="Aggregate"
            value={node.aggregate || ''}
            onChange={(e) => onUpdateNode(node.id, 'aggregate', e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            placeholder="e.g. UserAccount"
          />
        )}

        {node.type === 'INTEGRATION_EVENT' && (
          <TextField
            label="External System"
            value={node.externalSystem || ''}
            onChange={(e) => onUpdateNode(node.id, 'externalSystem', e.target.value)}
            fullWidth
            margin="normal"
            size="small"
            placeholder="e.g. Stripe, Auth0"
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
            {(node.entityIds || []).map((entityId: string) => {
              const def = definitions.find((d: any) => d.id === entityId);
              return (
                <Chip
                  key={entityId}
                  label={def?.name || 'Unknown'}
                  onDelete={() => handleEntityRemove(entityId)}
                  size="small"
                />
              );
            })}
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
  onUpdateLink: (id: string, key: string, value: any) => void;
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
  onUpdateNode: (id: string, key: string, value: any) => void;
  onDeleteNode: (id: string) => void;
  slices: Slice[];
  onAddSlice: (title: string) => string;
  crossModelSlices: any[];
}

const MultiNodeProperties: React.FC<MultiNodePropertiesProps> = ({
  nodes,
  onUpdateNode,
  onDeleteNode,
  slices,
  onAddSlice,
  crossModelSlices
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
    nodes.forEach((node: any) => {
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
          onClick={() => nodes.forEach((n: any) => onDeleteNode(n.id))}
          fullWidth
        >
          Delete All Selected
        </Button>
      </Box>
    </Box>
  );
};

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedItem,
  onUpdateNode,
  onUpdateLink,
  onDeleteLink,
  onDeleteNode,
  slices,
  onAddSlice,
  focusOnRender,
  onFocusHandled,
  definitions,
  onAddDefinition,
  modelId
}) => {
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  // Cross-model data
  const {
    crossModelSlices,
    crossModelDefinitions,
  } = useCrossModelData(modelId);

  useEffect(() => {
    if (focusOnRender && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
      onFocusHandled?.();
    }
  }, [focusOnRender, onFocusHandled, selectedItem]);

  if (!selectedItem) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography>Select an item to view properties</Typography>
      </Box>
    );
  }

  if (selectedItem.type === 'node') {
    return (
      <NodeProperties
        node={selectedItem.data}
        onUpdateNode={onUpdateNode}
        onDeleteNode={onDeleteNode}
        slices={slices}
        onAddSlice={onAddSlice}
        definitions={definitions}
        onAddDefinition={onAddDefinition}
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
        onUpdateLink={onUpdateLink}
        onDeleteLink={onDeleteLink}
        nameInputRef={nameInputRef}
      />
    );
  }

  if (selectedItem.type === 'multi-node') {
    return (
      <MultiNodeProperties
        nodes={selectedItem.data}
        onUpdateNode={onUpdateNode}
        onDeleteNode={onDeleteNode}
        slices={slices}
        onAddSlice={onAddSlice}
        crossModelSlices={crossModelSlices}
      />
    );
  }

  return null;
};

export default PropertiesPanel;