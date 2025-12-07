import React, { useState, useMemo } from 'react';
import { DataDefinition, DefinitionType } from '../../modeling';
import {
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    Add as AddIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    Button,
    Divider,
    Stack,
    IconButton,
    Autocomplete
} from '@mui/material';
import SmartSelect from '../../../shared/components/SmartSelect';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';
import { useCrossModelData } from '../../modeling';

interface DataDictionaryListProps {
    definitions: DataDefinition[];
    onAddDefinition: (def: Omit<DataDefinition, 'id'>) => string;
    onUpdateDefinition: (id: string, def: Partial<DataDefinition>) => void;
    onRemoveDefinition: (id: string) => void;
    modelId: string | null;
}

// Primitives allowed by Weavr Schema
const PRIMITIVE_TYPES = [
    'String', 'Boolean', 'Int', 'Double', 'Decimal', 'Long', 'Date', 'DateTime', 'UUID'
];

const getTypeColor = (type: DefinitionType) => {
    switch (type) {
        case DefinitionType.Entity: return '#3b82f6'; // Blue
        case DefinitionType.ValueObject: return '#22c55e'; // Green
        case DefinitionType.Enum: return '#f59e0b'; // Amber
        default: return '#9ca3af'; // Gray
    }
};

const DataDictionaryList: React.FC<DataDictionaryListProps> = ({
    definitions,
    onAddDefinition,
    onUpdateDefinition,
    onRemoveDefinition,
    modelId
}) => {
    const { crossModelDefinitions } = useCrossModelData(modelId);

    // State for deleting definitions
    const [deleteDefInfo, setDeleteDefInfo] = useState<{ id: string, anchorEl: HTMLElement } | null>(null);

    // Calculate available types for suggestions (Primitives + Value Objects + Enums)
    // We exclude Entities because in DDD, Entities are typically referenced by ID, not embedded.
    const typeSuggestions = useMemo(() => {
        const validDefNames = definitions
            .filter(d => d.type === DefinitionType.ValueObject || d.type === DefinitionType.Enum)
            .map(d => d.name)
            .sort();
        return [...PRIMITIVE_TYPES, ...validDefNames];
    }, [definitions]);

    // Filter suggestions for adding new definitions
    const remoteDefinitionOptions = useMemo(() => {
        const localNames = new Set(definitions.map(d => d.name.toLowerCase()));
        return crossModelDefinitions
            .filter(d => !localNames.has(d.label.toLowerCase()))
            .map(d => ({
                id: d.id,
                label: d.label,
                subLabel: `From ${d.modelName}`,
                group: 'Suggestions',
                originalData: d
            }));
    }, [crossModelDefinitions, definitions]);

    const handleAdd = (idOrName: string, option?: any) => {
        let newDefinition: Omit<DataDefinition, 'id'>;

        if (option && option.originalData) {
            // Import remote definition
            const remoteDef = option.originalData;
            const data = remoteDef.originalData;
            newDefinition = {
                name: remoteDef.label,
                type: data.type || DefinitionType.Entity,
                description: data.description,
                attributes: data.attributes || []
            };
        } else if (idOrName) {
            // Create new definition
            newDefinition = {
                name: idOrName,
                type: DefinitionType.Entity,
                description: '',
                attributes: []
            };
        } else {
            return;
        }

        onAddDefinition(newDefinition);
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
        <Box sx={{ pb: 10 }}>
            {/* Add New Definition */}
            <Box sx={{ mb: 2 }}>
                <SmartSelect
                    options={remoteDefinitionOptions}
                    value=""
                    onChange={(val, opt) => handleAdd(val, opt)}
                    onCreate={(name) => handleAdd(name)}
                    placeholder="Add or import entity..."
                    allowCustomValue={true}
                />
            </Box>

            {/* List */}
            <Box>
                {definitions.map((def) => (
                    <Accordion
                        key={def.id}
                        disableGutters
                        elevation={0}
                        sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            '&:not(:last-child)': { borderBottom: 0 },
                            '&:before': { display: 'none' },
                        }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{
                                backgroundColor: 'rgba(0, 0, 0, .03)',
                                flexDirection: 'row-reverse',
                                '& .MuiAccordionSummary-content': { ml: 1, alignItems: 'center' },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    bgcolor: getTypeColor(def.type),
                                    mr: 1.5,
                                    flexShrink: 0
                                }}
                            />
                            <Typography sx={{ fontWeight: 500, fontSize: '0.9rem', flex: 1 }}>
                                {def.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', mr: 2 }}>
                                {def.type}
                            </Typography>
                        </AccordionSummary>

                        <AccordionDetails sx={{ p: 2 }}>
                            <Stack spacing={2} sx={{ mb: 3 }}>
                                <TextField
                                    label="Name"
                                    size="small"
                                    fullWidth
                                    value={def.name || ''}
                                    onChange={(e) => onUpdateDefinition(def.id, { name: e.target.value })}
                                />

                                <Stack direction="row" spacing={2}>
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>Type</InputLabel>
                                        <Select
                                            value={def.type}
                                            label="Type"
                                            onChange={(e) => onUpdateDefinition(def.id, { type: e.target.value as DefinitionType })}
                                        >
                                            <MenuItem value={DefinitionType.Entity}>Entity</MenuItem>
                                            <MenuItem value={DefinitionType.ValueObject}>Value Object</MenuItem>
                                            <MenuItem value={DefinitionType.Enum}>Enum</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Stack>

                                <TextField
                                    label="Description"
                                    size="small"
                                    fullWidth
                                    multiline
                                    rows={2}
                                    value={def.description || ''}
                                    onChange={(e) => onUpdateDefinition(def.id, { description: e.target.value })}
                                />

                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button
                                        size="small"
                                        color="error"
                                        startIcon={<DeleteIcon />}
                                        onClick={(e) => {
                                            setDeleteDefInfo({ id: def.id, anchorEl: e.currentTarget });
                                        }}
                                    >
                                        Delete Definition
                                    </Button>
                                </Box>
                            </Stack>

                            <Divider sx={{ mb: 2 }} />

                            {/* Attributes Section */}
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="overline" color="text.secondary">
                                        Attributes
                                    </Typography>
                                    <Button
                                        size="small"
                                        startIcon={<AddIcon />}
                                        onClick={() => handleAddAttribute(def)}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Add Attribute
                                    </Button>
                                </Box>

                                <Stack spacing={1}>
                                    {(Array.isArray(def.attributes) ? def.attributes : []).map((attr, index) => (
                                        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <TextField
                                                placeholder="Name"
                                                size="small"
                                                value={attr.name}
                                                onChange={(e) => handleUpdateAttribute(def, index, 'name', e.target.value)}
                                                sx={{ flex: 1 }}
                                                inputProps={{ style: { fontSize: '0.85rem' } }}
                                            />
                                            {/* Autocomplete for Type */}
                                            <Autocomplete
                                                freeSolo
                                                options={typeSuggestions}
                                                value={attr.type}
                                                onChange={(_, newValue) => {
                                                    // Handle selection
                                                    if (newValue) {
                                                        handleUpdateAttribute(def, index, 'type', newValue);
                                                    }
                                                }}
                                                onInputChange={(_, newInputValue) => {
                                                    // Handle raw input
                                                    handleUpdateAttribute(def, index, 'type', newInputValue);
                                                }}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        placeholder="Type"
                                                        size="small"
                                                        inputProps={{ ...params.inputProps, style: { fontSize: '0.85rem' } }}
                                                    />
                                                )}
                                                sx={{ width: 140 }}
                                            />
                                            <IconButton
                                                size="small"
                                                color="default"
                                                onClick={() => handleDeleteAttribute(def, index)}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ))}
                                    {(def.attributes || []).length === 0 && (
                                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 1 }}>
                                            No attributes defined.
                                        </Typography>
                                    )}
                                </Stack>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ))}

                {definitions.length === 0 && (
                    <Typography color="text.secondary" align="center" sx={{ mt: 4, fontStyle: 'italic' }}>
                        No definitions created yet.
                    </Typography>
                )}
            </Box>

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
                message="Delete this definition?"
            />
        </Box>
    );
};

export default DataDictionaryList;
