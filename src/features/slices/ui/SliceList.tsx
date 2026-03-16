import React, { useMemo, useState, useEffect } from 'react';
import { Slice, SliceType, Specification, SpecificationStep } from '../../modeling';
import {
    Trash2,
    ChevronDown,
    Plus,
    X,
    GripVertical
} from 'lucide-react';
import SmartSelect from '../../../shared/components/SmartSelect';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';
import { useCrossModelData } from '../../modeling';
import { v4 as uuidv4 } from 'uuid';
import { GlassInput } from '../../../shared/components/GlassInput';
import { GlassButton } from '../../../shared/components/GlassButton';
import { SortableChapter } from './SortableChapter';

// DnD Kit Imports
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    pointerWithin,
    CollisionDetection,
    closestCorners
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
    onAddSlice: (title: string, order: number) => void;
    onUpdateSlice: (id: string, updates: Partial<Slice>) => void;
    onDeleteSlice: (id: string) => void;
    onManageSlice?: (id: string) => void;
    modelId: string | null;
    expandedId?: string | null;
    onAutoLayout?: () => void;
}

// --- Sortable Item Component ---
interface SortableSliceItemProps {
    slice: Slice;
    expanded: boolean;
    onExpandChange: (isExpanded: boolean) => void;
    onUpdateSlice: (id: string, updates: Partial<Slice>) => void;
    onDeleteSliceClick: (e: React.MouseEvent, id: string, anchor: HTMLElement) => void;
    children: React.ReactNode;
    disabled?: boolean;
}

const SortableSliceItem: React.FC<SortableSliceItemProps> = ({
    slice,
    expanded,
    onExpandChange,
    children,
    disabled = false
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
        <div ref={setNodeRef} style={style} className={`transition-opacity ${isDragging ? 'opacity-50' : 'opacity-100'} ${disabled ? 'pointer-events-none' : ''}`}>
             <div
                 className={`flex flex-col bg-white border border-gray-200 shadow-sm rounded-lg dark:bg-neutral-900 dark:border-neutral-700 transition-all duration-200 ${expanded ? 'bg-gray-50 dark:bg-neutral-800' : ''}`}
             >
                 {/* Header Area */}
                 <div className="flex items-center gap-0 list-none select-none">
                     {/* Drag Handle - Stays outside the clickable area for expansion */}
                     <div
                         {...attributes}
                         {...listeners}
                         onClick={(e) => e.stopPropagation()}
                         className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-400 cursor-grab active:cursor-grabbing p-3 -ml-1 h-full flex items-center"
                     >
                         <GripVertical size={16} />
                     </div>
 
                     {/* Clickable Area for Expansion */}
                     <div
                         onClick={() => onExpandChange(!expanded)}
                         className="flex-1 flex items-center gap-3 p-3 pl-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-r-lg"
                     >
                         <ChevronDown size={20} className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
 
                         <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: slice.color }} />
 
                         <span className="text-sm font-medium text-gray-800 dark:text-neutral-200 flex-1">{slice.title || 'Untitled Slice'}</span>
 
                         {slice.sliceType && (
                             <span className="inline-flex items-center gap-x-1.5 py-1 px-2 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-neutral-700 dark:text-white uppercase tracking-wider">
                                 {slice.sliceType}
                             </span>
                         )}
                     </div>
                 </div>
 
                 {/* Content Area */}
                 {expanded && (
                     <div className="p-4 bg-gray-50 dark:bg-neutral-800 border-t border-gray-200 dark:border-neutral-700 rounded-b-lg animate-in slide-in-from-top-2 duration-200">
                         {children}
                     </div>
                 )}
             </div>
        </div>
    );
};


// Sub-component for a single Specification Item
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
        const defaultType = section === 'given' ? 'SPEC_EVENT'
            : section === 'when' ? 'SPEC_COMMAND'
                : 'SPEC_READMODEL';

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
        onUpdate(spec.id, { [section]: newSteps });
    };

    const handleUpdateStep = (section: 'given' | 'when' | 'then', stepId: string, updates: Partial<SpecificationStep>) => {
        const newSteps = spec[section].map(s => s.id === stepId ? { ...s, ...updates } : s);
        onUpdate(spec.id, { [section]: newSteps });
    };

    const handleDeleteStep = (section: 'given' | 'when' | 'then', stepId: string) => {
        const newSteps = spec[section].filter(s => s.id !== stepId);
        onUpdate(spec.id, { [section]: newSteps });
    };

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
    };

    const handleAddExampleColumn = () => {
        const currentHeaders = spec.examples?.headers || ['Var 1'];
        const currentRows = spec.examples?.rows || [['Val 1']];
        const newHeaders = [...currentHeaders, `Var ${currentHeaders.length + 1}`];
        const newRows = currentRows.map(row => [...row, '']);
        onUpdate(spec.id, { examples: { headers: newHeaders, rows: newRows } });
    };

    const handleAddExampleRow = () => {
        const headers = spec.examples?.headers || ['Var 1'];
        const currentRows = spec.examples?.rows || [];
        const newRow = new Array(headers.length).fill('');
        onUpdate(spec.id, { examples: { headers, rows: [...currentRows, newRow] } });
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
        <details className="group border border-neutral-700 rounded-lg overflow-hidden bg-neutral-800 open:bg-neutral-700 mb-2 transition-all">
             <summary className="flex items-center justify-between px-3 py-2 cursor-pointer select-none list-none marker:hidden hover:bg-neutral-800">
                 <div className="flex items-center gap-2 flex-1">
                     <span className="transform transition-transform group-open:rotate-90 text-gray-400 text-xs">▶</span>
                     <input
                         type="text"
                         value={spec.title}
                         onChange={(e) => onUpdate(spec.id, { title: e.target.value })}
                         onClick={(e) => e.stopPropagation()}
                         className="bg-transparent border-none text-sm font-medium text-gray-800 dark:text-neutral-100 focus:ring-0 p-0 w-full outline-none"
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
                    <Trash2 size={16} />
                </button>
                <ConfirmMenu
                    open={Boolean(deleteAnchorEl)}
                    anchorEl={deleteAnchorEl}
                    onClose={() => setDeleteAnchorEl(null)}
                    onConfirm={() => onDelete(spec.id)}
                    message="Delete this specification?"
                />
            </summary>

            <div className="p-3 bg-black/5 dark:bg-neutral-800 border-t border-neutral-700 space-y-4">
                {(['given', 'when', 'then'] as const).map(section => {
                    const hasSteps = spec[section].length > 0;

                    if (!hasSteps) {
                        return (
                            <div key={section} className="flex justify-start">
                                <button
                                    onClick={() => handleAddStep(section)}
                                    className="text-[10px] text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 px-2 py-1 rounded border border-dashed border-neutral-600 hover:border-purple-400/30 transition-all"
                                >
                                    + Add {section}
                                </button>
                            </div>
                        );
                    }

                    return (
                        <div key={section} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between group/section">
                                <span className={`font-bold uppercase tracking-wide text-[10px] ${section === 'given' ? 'text-blue-500' :
                                    section === 'when' ? 'text-orange-500' : 'text-green-500'
                                    }`}>
                                    {section}
                                </span>
                                <div className="flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleAddStep(section)}
                                        className="text-gray-400 hover:text-purple-500 p-0.5 rounded hover:bg-purple-500/10"
                                    >
                                        <Plus size={14} />
                                    </button>
                                    <button
                                        onClick={() => onUpdate(spec.id, { [section]: [] })}
                                        className="text-gray-500 hover:text-red-500 p-0.5 rounded hover:bg-red-500/10"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <ul className="space-y-1">
                                {spec[section].map((step) => (
                                    <li key={step.id} className="flex items-start gap-1 group/step">
                                        <div className="w-[20px] flex justify-end mt-1 flex-shrink-0">
                                            <span className="text-gray-500 text-[10px]">•</span>
                                        </div>

                                        <textarea
                                            value={step.title}
                                            onChange={(e) => {
                                                handleUpdateStep(section, step.id, { title: e.target.value });
                                                handleInput(e);
                                            }}
                                            onInput={handleInput}
                                            autoFocus={step.id === focusTarget}
                                            ref={el => {
                                                if (el) {
                                                    el.style.height = 'auto'; // Reset
                                                    el.style.height = `${el.scrollHeight}px`;
                                                }
                                            }}
                                             className="flex-1 text-xs text-gray-700 dark:text-neutral-300 border border-transparent hover:border-blue-500/20 focus:border-blue-500 rounded px-1.5 py-0.5 bg-transparent focus:bg-neutral-700 transition-all outline-none resize-none overflow-hidden"
                                            placeholder={`Describe ${section}...`}
                                            rows={1}
                                            style={{ minHeight: '24px' }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleAddStep(section, step.id);
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => handleDeleteStep(section, step.id)}
                                            className="text-gray-500 hover:text-red-500 opacity-0 group-hover/step:opacity-100 transition-opacity p-0.5 mt-0.5"
                                            tabIndex={-1}
                                        >
                                            <X size={12} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}

                {/* Examples Section */}
                <div className="pt-2 border-t border-dashed border-neutral-600">
                    <details className="group/examples">
                        <summary className="text-[10px] font-bold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-slate-300 select-none list-none marker:hidden flex items-center gap-2">
                            <span className="transform transition-transform group-open/examples:rotate-90">▶</span>
                            Examples / Data Table
                        </summary>
                        <div className="mt-2 overflow-x-auto">
                            {!spec.examples ? (
                                <button
                                    onClick={handleAddExampleRow}
                                    className="text-xs text-purple-400 hover:text-purple-300 underline"
                                >
                                    + Create Examples Table
                                </button>
                            ) : (
                                <div className="min-w-full inline-block align-middle">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700 border border-gray-200 dark:border-neutral-700">
                                        <thead className="bg-gray-100 dark:bg-neutral-800">
                                            <tr>
                                                {(spec.examples.headers || []).map((header, i) => (
                                                    <th key={i} scope="col" className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-500 uppercase tracking-wider border-r border-gray-200 dark:border-neutral-700 last:border-r-0">
                                                        <input
                                                            type="text"
                                                            value={header}
                                                            onChange={(e) => updateExampleHeader(i, e.target.value)}
                                                            className="bg-transparent border-none w-full focus:ring-0 p-0 text-xs font-bold text-gray-700 dark:text-slate-300 outline-none"
                                                            placeholder="VAR"
                                                        />
                                                    </th>
                                                ))}
                                                <th className="px-1 py-1 w-6">
                                                    <button onClick={handleAddExampleColumn} className="text-purple-400 hover:text-purple-300" title="Add Column">+</button>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-transparent divide-y divide-gray-200 dark:divide-neutral-700">
                                            {(spec.examples.rows || []).map((row, rowIndex) => (
                                                <tr key={rowIndex}>
                                                    {row.map((cell, colIndex) => (
                                                        <td key={colIndex} className="px-2 py-1 whitespace-nowrap text-xs text-slate-600 dark:text-gray-400 border-r border-gray-200 dark:border-neutral-700 last:border-r-0">
                                                            <input
                                                                type="text"
                                                                value={cell}
                                                                onChange={(e) => updateExampleCell(rowIndex, colIndex, e.target.value)}
                                                                className="bg-transparent border-none w-full focus:ring-0 p-0 text-xs text-gray-700 dark:text-slate-300 outline-none"
                                                                placeholder="..."
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="px-1 py-1"></td>
                                                </tr>
                                            ))}
                                            <tr>
                                                <td colSpan={100} className="px-2 py-1">
                                                    <button onClick={handleAddExampleRow} className="text-xs text-gray-500 hover:text-purple-400">+ Add Row</button>
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
    onAddSlice,
    onUpdateSlice,
    onDeleteSlice,
    modelId,
    expandedId,
    onAutoLayout
}) => {
    const { crossModelSlices } = useCrossModelData(modelId);
    const [localExpandedId, setLocalExpandedId] = useState<string | null>(null);
    const [emptyChapters, setEmptyChapters] = useState<string[]>([]);

    // Grouping Logic
    const chapterGroups = useMemo(() => {
        const groups: Record<string, Slice[]> = {};
        const chapterOrder: string[] = [];
        const seenChapters = new Set<string>();

        // 1. Existing Slices
        slices.forEach(s => {
            const c = s.chapter || 'General';
            if (!groups[c]) {
                groups[c] = [];
                chapterOrder.push(c);
                seenChapters.add(c);
            }
            groups[c].push(s);
        });

        // 2. Empty Chapters (User Created)
        emptyChapters.forEach(c => {
            if (!seenChapters.has(c)) {
                groups[c] = [];
                chapterOrder.push(c);
                seenChapters.add(c);
            }
        });

        // We want to persist the concept of "Chapter Order".
        // For now, we rely on the order of the first slice of that chapter OR insertion order.
        return chapterOrder.map(c => ({
            id: `chapter:${c}`,
            name: c,
            slices: groups[c]
        }));
    }, [slices, emptyChapters]);

    useEffect(() => {
        if (expandedId) {
            setLocalExpandedId(expandedId);
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

    const [deleteSliceInfo, setDeleteSliceInfo] = useState<{ id: string, anchorEl: HTMLElement } | null>(null);
    const [deleteChapterInfo, setDeleteChapterInfo] = useState<{
        name: string,
        anchorEl: HTMLElement
    } | null>(null);

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

    const handleAdd = (title: string, chapterName?: string) => {
        if (title.trim()) {
            const normalizedTitle = title.trim().toLowerCase();
            // Allow duplicate names if we are just creating a new chapter placeholder
            if (!chapterName && slices.some(s => s.title?.toLowerCase() === normalizedTitle)) {
                alert('Slice with this name already exists.');
                return;
            }
            // For new chapters, we might create a generic slice name.
            onAddSlice(title.trim(), slices.length);
        }
    };

    const handleCreateChapter = () => {
        const name = prompt("Enter Name for New Chapter");
        if (name && name.trim()) {
            const chapterName = name.trim();
            // Just add to empty chapters.
            // If it's unique and not already in slices.
            if (!emptyChapters.includes(chapterName) && !slices.some(s => s.chapter === chapterName)) {
                setEmptyChapters(prev => [...prev, chapterName]);
            }
        }
    };

    const handleAddSlice = (idOrName: string, option?: any) => {
        if (option) {
            handleAdd(option.label);
        } else if (idOrName) {
            handleAdd(idOrName);
        }
    };

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
        updateSliceSpecs(slice.id, [...(slice.specifications || []), newSpec]);
    };

    const handleUpdateSpec = (slice: Slice, specId: string, updates: Partial<Specification>) => {
        const updatedSpecs = (slice.specifications || []).map(s => s.id === specId ? { ...s, ...updates } : s);
        updateSliceSpecs(slice.id, updatedSpecs);
    };

    const handleDeleteSpec = (slice: Slice, specId: string) => {
        const updatedSpecs = (slice.specifications || []).filter(s => s.id !== specId);
        updateSliceSpecs(slice.id, updatedSpecs);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const isDraggingChapter = activeDragId ? activeDragId.startsWith('chapter:') : false;

    // Custom collision strategy to prevent Slices from interfering with Chapter sorting
    const customCollisionDetection: CollisionDetection = (args) => {
        const { active, droppableContainers } = args;

        // 1. If dragging a Chapter, ONLY collide with other Chapters, using pointerWithin (cursor based)
        // This ignores the geometry of the "tail" and only cares about where the user's cursor is.
        if (active.id.toString().startsWith('chapter:')) {
            const chapterContainers = droppableContainers.filter(container =>
                container.id.toString().startsWith('chapter:')
            );
            return pointerWithin({
                ...args,
                droppableContainers: chapterContainers
            });
        }

        // 2. If dragging a Slice, use closestCorners.
        // This was the state ("Step 998") where user said moving slices was "VERY smooth".
        // pointerWithin was found to be less stable for slices in subsequent steps.
        return closestCorners(args);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // ONLY handle if dragging a Slice
        if (activeId.startsWith('chapter:')) return;

        const activeSlice = slices.find(s => s.id === activeId);
        if (!activeSlice) return;

        const activeChapter = activeSlice.chapter || 'General';

        // 1. Hovered over a Chapter Header
        if (overId.startsWith('chapter:')) {
            const overChapterName = overId.replace('chapter:', '');
            if (activeChapter !== overChapterName) {
                onUpdateSlice(activeId, { chapter: overChapterName === 'General' ? undefined : overChapterName });
            }
            return;
        }

        // 2. Hovered over another Slice
        const overSlice = slices.find(s => s.id === overId);
        if (!overSlice) return;

        const overChapter = overSlice.chapter || 'General';

        if (activeChapter !== overChapter) {
            onUpdateSlice(activeId, { chapter: overChapter === 'General' ? undefined : overChapter });
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        const { active, over } = event;
        if (!over) return;
        if (active.id === over.id) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // 1. Chapter Reordering
        if (activeId.startsWith('chapter:')) {
            const activeChapterName = activeId.replace('chapter:', '');
            const overChapterName = overId.startsWith('chapter:')
                ? overId.replace('chapter:', '')
                : slices.find(s => s.id === overId)?.chapter || 'General';

            const oldGroupIndex = chapterGroups.findIndex(g => g.name === activeChapterName);
            const newGroupIndex = chapterGroups.findIndex(g => g.name === overChapterName);

            if (oldGroupIndex !== -1 && newGroupIndex !== -1 && oldGroupIndex !== newGroupIndex) {
                const reorderedGroups = arrayMove(chapterGroups, oldGroupIndex, newGroupIndex);
                let globalIndex = 0;
                reorderedGroups.forEach(group => {
                    group.slices.forEach(slice => {
                        if (slice.order !== globalIndex) {
                            onUpdateSlice(slice.id, { order: globalIndex });
                        }
                        globalIndex++;
                    });
                });
                onAutoLayout?.();
            }
            return;
        }

        // 2. Slice Reordering
        const activeSlice = slices.find(s => s.id === activeId);
        if (activeSlice) {
            const oldIndex = slices.findIndex(s => s.id === activeId);
            let newIndex = oldIndex;
            let targetChapter: string | null = null;

            // Determine target position and chapter
            if (overId.startsWith('chapter:')) {
                // Dropped on a Chapter Header
                targetChapter = overId.replace('chapter:', '');
                const group = chapterGroups.find(g => g.name === targetChapter);
                if (group) {
                    if (group.slices.length > 0) {
                        // Move to the beginning of the chapter
                        newIndex = slices.findIndex(s => s.id === group.slices[0].id);
                    } else {
                        // Empty chapter case: find the insertion point
                        const groupIndex = chapterGroups.findIndex(g => g.name === targetChapter);
                        const nextGroups = chapterGroups.slice(groupIndex + 1);
                        const nextGroupWithSlices = nextGroups.find(g => g.slices.length > 0);

                        if (nextGroupWithSlices) {
                            newIndex = slices.findIndex(s => s.id === nextGroupWithSlices.slices[0].id);
                        } else {
                            newIndex = slices.length;
                        }
                    }
                }
            } else {
                // Dropped on another Slice
                const overSlice = slices.find(s => s.id === overId);
                if (overSlice) {
                    newIndex = slices.findIndex(s => s.id === overId);
                    targetChapter = overSlice.chapter || 'General';
                }
            }

            // Apply updates
            if (oldIndex !== newIndex || (targetChapter && (activeSlice.chapter || 'General') !== targetChapter)) {
                const reorderedSlices = arrayMove(slices, oldIndex, newIndex);
                reorderedSlices.forEach((slice, index) => {
                    const updates: Partial<Slice> = {};
                    let changed = false;

                    if (slice.order !== index) {
                        updates.order = index;
                        changed = true;
                    }

                    if (slice.id === activeId && targetChapter) {
                        const normalizedTarget = targetChapter === 'General' ? undefined : targetChapter;
                        if (slice.chapter !== normalizedTarget) {
                            updates.chapter = normalizedTarget;
                            changed = true;
                        }
                    }

                    if (changed) {
                        onUpdateSlice(slice.id, updates);
                    }
                });
                setTimeout(() => onAutoLayout?.(), 200);
            }
        }
    };

    const handleDeleteChapter = (name: string, mode: 'ungroup' | 'delete') => {
        const group = chapterGroups.find(g => g.name === name);
        if (!group) return;

        if (mode === 'delete') {
            group.slices.forEach(s => onDeleteSlice(s.id));
        } else {
            // Ungroup: Set chapter to null (General)
            group.slices.forEach(s => onUpdateSlice(s.id, { chapter: undefined }));
        }

        // Also remove from emptyChapters if it was there
        setEmptyChapters(prev => prev.filter(c => c !== name));

        setDeleteChapterInfo(null);
    };

    const handleRenameChapter = (oldName: string, newName: string) => {
        if (!newName.trim() || oldName === newName) return;

        // If it was an empty chapter, rename it in state
        if (emptyChapters.includes(oldName)) {
            setEmptyChapters(prev => prev.map(c => c === oldName ? newName.trim() : c));
        }

        const group = chapterGroups.find(g => g.name === oldName);
        if (group) {
            // If newName matches an existing chapter, we are effectively merging.
            // That is fine, we just update all slices to the new name.
            group.slices.forEach(s => {
                onUpdateSlice(s.id, { chapter: newName.trim() });
            });
        }
    };

    return (
        <div className="pb-20">
            <div className="mb-4 flex gap-2">
                <div className="flex-grow">
                    <SmartSelect
                        options={remoteSliceOptions}
                        value=""
                        onChange={handleAddSlice}
                        onCreate={(name) => handleAdd(name)}
                        placeholder="Add slice..."
                        allowCustomValue={false}
                        autoFocus={true}
                    />
                </div>
                <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={handleCreateChapter}
                    title="Add New Chapter"
                >
                    <Plus size={16} /> <span className="sr-only">Chapter</span>
                </GlassButton>
            </div>

            <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                <SortableContext items={chapterGroups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                    <div>
                        {chapterGroups.map(group => (
                            <SortableChapter
                                key={group.id}
                                id={group.id}
                                chapterName={group.name}
                                slices={group.slices}
                                onDelete={(name) => {
                                    setDeleteChapterInfo({ name, anchorEl: document.activeElement as HTMLElement })
                                }}
                                onRename={handleRenameChapter}
                            >
                                <SortableContext items={group.slices.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                    {group.slices.map(slice => (
                                        <SortableSliceItem
                                            key={slice.id}
                                            slice={slice}
                                            expanded={localExpandedId === slice.id}
                                            onExpandChange={(isExpanded) => setLocalExpandedId(isExpanded ? slice.id : null)}
                                            onUpdateSlice={onUpdateSlice}
                                            onDeleteSliceClick={(_e, id, anchor) => setDeleteSliceInfo({ id, anchorEl: anchor })}
                                            disabled={isDraggingChapter}
                                        >
                                            <div className="flex flex-col gap-4 mb-6">
                                                <GlassInput
                                                    id={`slice-name-input-${slice.id}`}
                                                    label="Slice Name"
                                                    value={slice.title || ''}
                                                    onChange={(e) => onUpdateSlice(slice.id, { title: e.target.value })}
                                                    className="w-full"
                                                />

                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex gap-2">
                                                        <div className="w-1/3">
                                                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 ml-1">Type</label>
                                                            <select
                                                                value={slice.sliceType || ''}
                                                                onChange={(e) => onUpdateSlice(slice.id, { sliceType: e.target.value as SliceType })}
                                                                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none text-sm"
                                                            >
                                                                <option value="">None</option>
                                                                <option value={SliceType.StateChange}>Command</option>
                                                                <option value={SliceType.StateView}>View</option>
                                                                <option value={SliceType.Automation}>Auto</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex-grow">
                                                            <GlassInput
                                                                label="Bounded Context"
                                                                value={slice.context || ''}
                                                                onChange={(e) => onUpdateSlice(slice.id, { context: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end">
                                                    <GlassButton
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={(e) => setDeleteSliceInfo({ id: slice.id, anchorEl: e.currentTarget })}
                                                    >
                                                        <Trash2 size={16} className="mr-1" /> Delete Slice
                                                    </GlassButton>
                                                </div>
                                            </div>

                                            <div className="h-px bg-gray-200 dark:bg-neutral-700 mb-4"></div>

                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Specifications</div>
                                                    <GlassButton variant="ghost" size="sm" onClick={() => handleAddSpecToSlice(slice)}>
                                                        <Plus size={16} className="mr-1" /> Add Spec
                                                    </GlassButton>
                                                </div>

                                                <div>
                                                    {(slice.specifications || []).length === 0 ? (
                                                        <p className="text-center text-xs text-gray-400 italic py-2">No specifications yet.</p>
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
                                                </div>
                                            </div>
                                        </SortableSliceItem>
                                    ))}
                                </SortableContext>
                            </SortableChapter>
                        ))}
                        {slices.length === 0 && (
                            <p className="text-center text-gray-500 pt-8 italic">No slices created yet.</p>
                        )}
                    </div>
                </SortableContext>
            </DndContext>

            <ConfirmMenu
                open={Boolean(deleteSliceInfo)}
                anchorEl={deleteSliceInfo?.anchorEl || null}
                onClose={() => setDeleteSliceInfo(null)}
                onConfirm={() => {
                    if (deleteSliceInfo) onDeleteSlice(deleteSliceInfo.id);
                }}
                message="Delete this slice and all its properties?"
            />

            {/* Chapter Delete Menu */}
            <ConfirmMenu
                open={Boolean(deleteChapterInfo)}
                anchorEl={deleteChapterInfo?.anchorEl || null}
                onClose={() => setDeleteChapterInfo(null)}
                onConfirm={() => {
                    if (deleteChapterInfo) handleDeleteChapter(deleteChapterInfo.name, 'ungroup');
                }}
                message={`Delete or Ungroup "${deleteChapterInfo?.name}"?`}
                confirmLabel="Ungroup All"
            />
        </div>
    );
};

export default SliceList;
