import React, { useMemo, useState, useEffect } from 'react';
import { Slice, DataDefinition, SliceType, Specification, SpecificationStep } from '../../modeling';
import {
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    Add as AddIcon,
    Close as CloseIcon,
    DragIndicator as DragIndicatorIcon
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
    Stack
    // IconButton removed
} from '@mui/material';
import SmartSelect from '../../../shared/components/SmartSelect';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';
import { useCrossModelData } from '../../modeling';
import { v4 as uuidv4 } from 'uuid';

// DnD Kit Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SliceListProps {
    slices: Slice[];
    definitions: DataDefinition[];
    onAddSlice: (title: string, order: number) => void;
    onUpdateSlice: (id: string, updates: Partial<Slice>) => void;
    onDeleteSlice: (id: string) => void;
    onManageSlice?: (id: string) => void; // Optional handler to open modal
    modelId: string | null;
    expandedId?: string | null;
}

// --- Sortable Item Component ---
interface SortableSliceItemProps {
    slice: Slice;
    expanded: boolean;
    onExpandChange: (isExpanded: boolean) => void;
    onUpdateSlice: (id: string, updates: Partial<Slice>) => void;
    onDeleteSliceClick: (e: React.MouseEvent, id: string, anchor: HTMLElement) => void;

    // Pass-through for children content rendering to keep this logic clean(er)
    children: React.ReactNode;
}

const SortableSliceItem: React.FC<SortableSliceItemProps> = ({
    slice,
    expanded,
    onExpandChange,
    children
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: slice.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        position: isDragging ? 'relative' as const : undefined,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Accordion
                expanded={expanded}
                onChange={(_, isExpanded) => onExpandChange(isExpanded)}
                disableGutters
                elevation={isDragging ? 4 : 0}
                sx={{
                    border: '1px solid',
                    borderColor: isDragging ? 'primary.main' : 'divider',
                    '&:not(:last-child)': { borderBottom: 0 },
                    '&:before': { display: 'none' },
                    opacity: isDragging ? 0.8 : 1
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                        backgroundColor: expanded ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, .03)',
                        flexDirection: 'row-reverse',
                        '& .MuiAccordionSummary-content': { ml: 1, alignItems: 'center' },
                    }}
                >
                    <Box
                        sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: slice.color,
                            mr: 1.5,
                            flexShrink: 0
                        }}
                    />
                    <Typography sx={{ fontWeight: 500, fontSize: '0.9rem', flex: 1 }}>
                        {slice.title || 'Untitled Slice'}
                    </Typography>

                    {/* Drag Handle */}
                    <Box
                        {...attributes}
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                            cursor: 'grab',
                            color: 'text.secondary',
                            display: 'flex',
                            alignItems: 'center',
                            mr: 1,
                            '&:hover': { color: 'text.primary' },
                            '&:active': { cursor: 'grabbing' }
                        }}
                    >
                        <DragIndicatorIcon fontSize="small" />
                    </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ p: 2 }}>
                    {children}
                </AccordionDetails>
            </Accordion>
        </div>
    );
};


// Sub-component for a single Specification Item (HTML details/summary style)
const SpecificationItem: React.FC<{
    spec: Specification;
    onUpdate: (id: string, updates: Partial<Specification>) => void;
    onDelete: (id: string) => void;
}> = ({ spec, onUpdate, onDelete }) => {
    const [deleteAnchorEl, setDeleteAnchorEl] = useState<HTMLElement | null>(null);
    const [focusTarget, setFocusTarget] = useState<string | null>(null);

    const handleAddStep = (section: 'given' | 'when' | 'then', insertAfterId?: string) => {
        const currentSteps = spec[section];
        const newId = uuidv4();

        // Default type must be set. Infer from section or use a default?
        // Schema requires 'type' enum.
        const defaultType = section === 'given' ? 'SPEC_EVENT'
            : section === 'when' ? 'SPEC_COMMAND'
                : 'SPEC_READMODEL'; // Heuristic defaults

        const newStep: SpecificationStep = {
            id: newId,
            title: '',
            type: defaultType
        };

        let newSteps = [...currentSteps];
        if (insertAfterId) {
            const index = newSteps.findIndex(s => s.id === insertAfterId);
            if (index !== -1) {
                newSteps.splice(index + 1, 0, newStep);
            } else {
                newSteps.push(newStep);
            }
        } else {
            newSteps.push(newStep);
        }

        setFocusTarget(newId);
        onUpdate(spec.id, {
            [section]: newSteps
        });
    };

    const handleUpdateStep = (section: 'given' | 'when' | 'then', stepId: string, updates: Partial<SpecificationStep>) => {
        const newSteps = spec[section].map(s => s.id === stepId ? { ...s, ...updates } : s);
        onUpdate(spec.id, { [section]: newSteps });
    };

    const handleDeleteStep = (section: 'given' | 'when' | 'then', stepId: string) => {
        const newSteps = spec[section].filter(s => s.id !== stepId);
        onUpdate(spec.id, { [section]: newSteps });
    };

    // Auto-resize textarea logic
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        target.style.height = 'auto'; // Reset to re-calculate (shrink if needed)
        target.style.height = `${target.scrollHeight}px`;
    };

    // Example Table Logic
    const handleAddExampleColumn = () => {
        const currentHeaders = spec.examples?.headers || ['Var 1'];
        const currentRows = spec.examples?.rows || [['Val 1']];

        const newHeaders = [...currentHeaders, `Var ${currentHeaders.length + 1}`];
        const newRows = currentRows.map(row => [...row, '']);

        onUpdate(spec.id, {
            examples: { headers: newHeaders, rows: newRows }
        });
    };

    const handleAddExampleRow = () => {
        const headers = spec.examples?.headers || ['Var 1'];
        const currentRows = spec.examples?.rows || [];
        const newRow = new Array(headers.length).fill('');

        onUpdate(spec.id, {
            examples: { headers, rows: [...currentRows, newRow] }
        });
    };

    const updateExampleHeader = (index: number, value: string) => {
        const headers = [...(spec.examples?.headers || [])];
        headers[index] = value;
        onUpdate(spec.id, { examples: { ...spec.examples!, headers } });
    };

    const updateExampleCell = (rowIndex: number, colIndex: number, value: string) => {
        const rows = [...(spec.examples?.rows || [])];
        rows[rowIndex] = [...rows[rowIndex]];
        rows[rowIndex][colIndex] = value;
        onUpdate(spec.id, { examples: { ...spec.examples!, rows } });
    };

    return (
        <details className="group border border-gray-200 rounded-md overflow-hidden bg-white mb-2 open:shadow-sm transition-all">
            <summary className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 select-none list-none marker:hidden">
                <div className="flex items-center gap-2 flex-1">
                    <span className="transform transition-transform group-open:rotate-90 text-gray-400 text-xs">▶</span>
                    <input
                        type="text"
                        value={spec.title}
                        onChange={(e) => onUpdate(spec.id, { title: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 p-0 w-full"
                        placeholder="Specification Title"
                    />
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setDeleteAnchorEl(e.currentTarget);
                    }}
                    className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Specification"
                >
                    <DeleteIcon fontSize="small" style={{ fontSize: 16 }} />
                </button>
                <ConfirmMenu
                    open={Boolean(deleteAnchorEl)}
                    anchorEl={deleteAnchorEl}
                    onClose={() => setDeleteAnchorEl(null)}
                    onConfirm={() => onDelete(spec.id)}
                    message="Delete this specification?"
                />
            </summary>

            <div className="p-3 bg-white border-t border-gray-100 space-y-4">
                {(['given', 'when', 'then'] as const).map(section => {
                    const hasSteps = spec[section].length > 0;

                    if (!hasSteps) {
                        return (
                            <div key={section} className="flex justify-start">
                                <button
                                    onClick={() => handleAddStep(section)}
                                    className="text-[10px] text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded border border-dashed border-gray-200 hover:border-indigo-200 transition-all"
                                >
                                    + Add {section}
                                </button>
                            </div>
                        );
                    }

                    return (
                        <div key={section} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between group/section">
                                <span className={`font-bold uppercase tracking-wide text-[10px] ${section === 'given' ? 'text-blue-700' :
                                    section === 'when' ? 'text-orange-700' : 'text-green-700'
                                    }`}>
                                    {section}
                                </span>
                                <div className="flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleAddStep(section)}
                                        className="text-gray-400 hover:text-indigo-600 p-0.5 rounded hover:bg-indigo-50"
                                        title={`Add ${section} step`}
                                    >
                                        <AddIcon style={{ fontSize: 14 }} />
                                    </button>
                                    <button
                                        onClick={() => onUpdate(spec.id, { [section]: [] })}
                                        className="text-gray-300 hover:text-red-500 p-0.5 rounded hover:bg-red-50"
                                        title={`Remove ${section} section`}
                                    >
                                        <DeleteIcon style={{ fontSize: 14 }} />
                                    </button>
                                </div>
                            </div>

                            <ul className="space-y-1">
                                {spec[section].map((step) => (
                                    <li key={step.id} className="flex items-start gap-1 group/step">
                                        {/* Simple Bullet */}
                                        <div className="w-[32px] flex justify-end mt-1 flex-shrink-0">
                                            <span className="text-gray-300 text-[10px]">•</span>
                                        </div>

                                        <textarea
                                            value={step.title}
                                            onChange={(e) => {
                                                handleUpdateStep(section, step.id, { title: e.target.value });
                                                handleInput(e);
                                            }}
                                            onInput={handleInput}
                                            autoFocus={step.id === focusTarget}
                                            // Initialize height on mount
                                            ref={el => {
                                                if (el) {
                                                    el.style.height = 'auto'; // Reset
                                                    el.style.height = `${el.scrollHeight}px`;
                                                }
                                            }}
                                            className="flex-1 text-xs text-gray-700 border border-transparent hover:border-gray-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 rounded px-1.5 py-0.5 bg-transparent focus:bg-white transition-all outline-none resize-none overflow-hidden"
                                            placeholder={`Describe ${section}...`}
                                            rows={1}
                                            style={{ minHeight: '24px' }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    if (!e.shiftKey) {
                                                        e.preventDefault();
                                                        handleAddStep(section, step.id);
                                                    }
                                                    // Shift+Enter allows newline (default behavior)
                                                }
                                                // Handle Backspace to delete empty step if it's not the only one? 
                                                // (Optional: standard text editor behavior)
                                            }}
                                        />
                                        <button
                                            onClick={() => handleDeleteStep(section, step.id)}
                                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover/step:opacity-100 transition-opacity p-0.5 mt-0.5"
                                            tabIndex={-1}
                                        >
                                            <CloseIcon style={{ fontSize: 12 }} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}

                {/* Examples Section */}
                <div className="pt-2 border-t border-dashed border-gray-200">
                    <details className="group/examples">
                        <summary className="text-[10px] font-bold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none list-none marker:hidden flex items-center gap-2">
                            <span className="transform transition-transform group-open/examples:rotate-90">▶</span>
                            Examples / Data Table
                        </summary>
                        <div className="mt-2 overflow-x-auto">
                            {!spec.examples ? (
                                <button
                                    onClick={handleAddExampleRow}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                                >
                                    + Create Examples Table
                                </button>
                            ) : (
                                <div className="min-w-full inline-block align-middle">
                                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {(spec.examples.headers || []).map((header, i) => (
                                                    <th key={i} scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                                                        <input
                                                            type="text"
                                                            value={header}
                                                            onChange={(e) => updateExampleHeader(i, e.target.value)}
                                                            className="bg-transparent border-none w-full focus:ring-0 p-0 text-xs font-bold"
                                                            placeholder="VAR"
                                                        />
                                                    </th>
                                                ))}
                                                <th className="px-1 py-1 w-6">
                                                    <button onClick={handleAddExampleColumn} className="text-indigo-500 hover:text-indigo-700" title="Add Column">+</button>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {(spec.examples.rows || []).map((row, rowIndex) => (
                                                <tr key={rowIndex}>
                                                    {row.map((cell, colIndex) => (
                                                        <td key={colIndex} className="px-2 py-1 whitespace-nowrap text-xs text-gray-500 border-r border-gray-200 last:border-r-0">
                                                            <input
                                                                type="text"
                                                                value={cell}
                                                                onChange={(e) => updateExampleCell(rowIndex, colIndex, e.target.value)}
                                                                className="bg-transparent border-none w-full focus:ring-0 p-0 text-xs"
                                                                placeholder="..."
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="px-1 py-1"></td>
                                                </tr>
                                            ))}
                                            <tr>
                                                <td colSpan={100} className="px-2 py-1">
                                                    <button onClick={handleAddExampleRow} className="text-xs text-gray-400 hover:text-indigo-600">+ Add Row</button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </details>
                </div>
            </div>
        </details>
    );
};

const SliceList: React.FC<SliceListProps> = ({
    slices,
    definitions,
    onAddSlice,
    onUpdateSlice,
    onDeleteSlice,
    modelId,
    expandedId
}) => {
    const { crossModelSlices } = useCrossModelData(modelId);

    // State for local expansion management
    const [localExpandedId, setLocalExpandedId] = useState<string | null>(null);

    // Synchronize local expansion state with the prop and trigger focus
    useEffect(() => {
        if (expandedId) {
            setLocalExpandedId(expandedId);
            // Wait for accordion expansion animation to begin so the input is rendered
            const timer = setTimeout(() => {
                const input = document.getElementById(`slice-name-input-${expandedId}`);
                if (input instanceof HTMLInputElement) {
                    input.focus();
                    input.select();
                }
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [expandedId]);

    // State for deleting slices (which one and anchor element)
    const [deleteSliceInfo, setDeleteSliceInfo] = useState<{ id: string, anchorEl: HTMLElement } | null>(null);

    // Filter suggestions
    const remoteSliceOptions = useMemo(() => {
        const localTitles = new Set(slices.map(s => (s.title || '').toLowerCase()));
        return crossModelSlices
            .filter(s => !localTitles.has(s.label.toLowerCase()))
            .map(s => ({
                id: s.id,
                label: s.label,
                subLabel: `From ${s.modelName}`,
                group: 'Suggestions',
                originalData: s
            }));
    }, [crossModelSlices, slices]);

    const handleAdd = (title: string) => {
        if (title.trim()) {
            const normalizedTitle = title.trim().toLowerCase();
            if (slices.some(s => s.title?.toLowerCase() === normalizedTitle)) {
                alert('Slice with this name already exists in this model.');
                return;
            }
            if (definitions.some(d => d.name.toLowerCase() === normalizedTitle)) {
                alert('An Entity with this name already exists. Names must be unique.');
                return;
            }
            onAddSlice(title.trim(), slices.length);
        }
    };

    const handleAddSlice = (idOrName: string, option?: any) => {
        if (option) {
            handleAdd(option.label);
        } else if (idOrName) {
            handleAdd(idOrName);
        }
    };

    // --- Specification Handlers ---
    const updateSliceSpecs = (sliceId: string, specs: Specification[]) => {
        onUpdateSlice(sliceId, { specifications: specs });
    };

    const handleAddSpecToSlice = (slice: Slice) => {
        const newSpec: Specification = {
            id: uuidv4(),
            title: `Scenario ${(slice.specifications?.length || 0) + 1}`,
            given: [],
            when: [],
            then: []
        };
        const currentSpecs = slice.specifications || [];
        updateSliceSpecs(slice.id, [...currentSpecs, newSpec]);
    };

    const handleUpdateSpec = (slice: Slice, specId: string, updates: Partial<Specification>) => {
        const currentSpecs = slice.specifications || [];
        const updatedSpecs = currentSpecs.map(s => s.id === specId ? { ...s, ...updates } : s);
        updateSliceSpecs(slice.id, updatedSpecs);
    };

    const handleDeleteSpec = (slice: Slice, specId: string) => {
        const currentSpecs = slice.specifications || [];
        const updatedSpecs = currentSpecs.filter(s => s.id !== specId);
        updateSliceSpecs(slice.id, updatedSpecs);
    };

    // --- DnD Sensors ---
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = slices.findIndex((s) => s.id === active.id);
            const newIndex = slices.findIndex((s) => s.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                // 1. Move the item in the local array to calculate new order
                const reorderedSlices = arrayMove(slices, oldIndex, newIndex);

                // 2. Update orders for ALL slices based on their new index
                // This ensures everything stays clean in the database
                reorderedSlices.forEach((slice, index) => {
                    if (slice.order !== index) {
                        onUpdateSlice(slice.id, { order: index });
                    }
                });
            }
        }
    };

    // Ensure slices are sorted for the SortableContext
    // The parent likely passes them sorted, but redundant check doesn't hurt or we rely on prop order
    // NOTE: If parent doesn't sort by order, the UI might jump. Relying on parent or explicit sort here.
    // Let's explicitly sort for display safety if not already guaranteed.
    // Actually, re-sorting prop here might cause issues if onUpdateSlice is async/laggy. 
    // Usually standard to assume props update. 
    // We'll trust the prop 'slices' is the source of truth, but for DnD items we need IDs.
    const sliceIds = useMemo(() => slices.map(s => s.id), [slices]);

    return (
        <Box sx={{ pb: 10 }}> {/* Padding for scroll */}
            {/* Add New Slice */}
            <Box sx={{ mb: 2 }}>
                <SmartSelect
                    options={remoteSliceOptions}
                    value=""
                    onChange={handleAddSlice}
                    onCreate={(name) => handleAdd(name)}
                    placeholder="Add or import slice..."
                    allowCustomValue={false}
                />
            </Box>

            {/* List */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={sliceIds}
                    strategy={verticalListSortingStrategy}
                >
                    <div>
                        {slices.map((slice) => (
                            <SortableSliceItem
                                key={slice.id}
                                slice={slice}
                                expanded={localExpandedId === slice.id}
                                onExpandChange={(isExpanded) => {
                                    setLocalExpandedId(isExpanded ? slice.id : null);
                                }}
                                onUpdateSlice={onUpdateSlice}
                                onDeleteSliceClick={(_e, id, anchor) => {
                                    setDeleteSliceInfo({ id, anchorEl: anchor });
                                }}
                            >
                                {/* Properties Content */}
                                <Stack spacing={2} sx={{ mb: 3 }}>
                                    <TextField
                                        id={`slice-name-input-${slice.id}`}
                                        label="Slice Name"
                                        size="small"
                                        fullWidth
                                        value={slice.title || ''}
                                        onChange={(e) => onUpdateSlice(slice.id, { title: e.target.value })}
                                    // key prop to force re-render if needed or rely on value? 
                                    />

                                    <Stack direction="row" spacing={2}>
                                        <FormControl size="small" fullWidth>
                                            <InputLabel>Type</InputLabel>
                                            <Select
                                                value={slice.sliceType || ''}
                                                label="Type"
                                                onChange={(e) => onUpdateSlice(slice.id, { sliceType: e.target.value as SliceType })}
                                            >
                                                <MenuItem value=""><em>None</em></MenuItem>
                                                <MenuItem value={SliceType.StateChange}>Command</MenuItem>
                                                <MenuItem value={SliceType.StateView}>View</MenuItem>
                                                <MenuItem value={SliceType.Automation}>Auto</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <TextField
                                            label="Bounded Context"
                                            size="small"
                                            fullWidth
                                            value={slice.context || ''}
                                            onChange={(e) => onUpdateSlice(slice.id, { context: e.target.value })}
                                        />
                                    </Stack>

                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <Button
                                            size="small"
                                            color="error"
                                            startIcon={<DeleteIcon />}
                                            onClick={(e) => {
                                                setDeleteSliceInfo({ id: slice.id, anchorEl: e.currentTarget });
                                            }}
                                        >
                                            Delete Slice
                                        </Button>
                                    </Box>
                                </Stack>

                                <Divider sx={{ mb: 2 }} />

                                {/* Specifications */}
                                <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="overline" color="text.secondary">
                                            Specifications
                                        </Typography>
                                        <Button
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={() => handleAddSpecToSlice(slice)}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Add Spec
                                        </Button>
                                    </Box>

                                    <Box>
                                        {(slice.specifications || []).length === 0 ? (
                                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', textAlign: 'center', py: 1 }}>
                                                No specifications yet.
                                            </Typography>
                                        ) : (
                                            (slice.specifications || []).map(spec => (
                                                <SpecificationItem
                                                    key={spec.id}
                                                    spec={spec}
                                                    onUpdate={(id, updates) => handleUpdateSpec(slice, id, updates)}
                                                    onDelete={(id) => handleDeleteSpec(slice, id)}
                                                />
                                            ))
                                        )}
                                    </Box>
                                </Box>
                            </SortableSliceItem>
                        ))}

                        {slices.length === 0 && (
                            <Typography color="text.secondary" align="center" sx={{ mt: 4, fontStyle: 'italic' }}>
                                No slices created yet.
                            </Typography>
                        )}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Confirm Deletion Menu for Slices */}
            <ConfirmMenu
                open={Boolean(deleteSliceInfo)}
                anchorEl={deleteSliceInfo?.anchorEl || null}
                onClose={() => setDeleteSliceInfo(null)}
                onConfirm={() => {
                    if (deleteSliceInfo) {
                        onDeleteSlice(deleteSliceInfo.id);
                    }
                }}
                message="Delete this slice and all its properties?"
            />
        </Box>
    );
};

export default SliceList;
