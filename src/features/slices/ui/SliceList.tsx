import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Slice, SliceType, Specification, SpecificationStep } from '../../modeling';
import { useCrossModelData } from '../../modeling';
import {
    Plus,
    X,
    GripVertical,
    Cpu,
    Network,
    MousePointer2,
    Eye,
    Trash2,
    ChevronDown
} from 'lucide-react';
import SmartSelect from '../../../shared/components/SmartSelect';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '../../../shared/components/ui/input';
import { Button } from '../../../shared/components/ui/button';
import { GlassSelect } from '../../../shared/components/GlassSelect';
import { GlassColorPicker } from '../../../shared/components/GlassColorPicker';

import { Textarea } from '../../../shared/components/ui/textarea';
import { Label } from '../../../shared/components/ui/label';
import { SortableChapter } from './SortableChapter';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "../../../shared/components/ui/accordion";

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
import { useDebouncedInput } from '../../../shared/hooks/useDebouncedInput';

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
    const { t } = useTranslation();
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
                className={`flex flex-col bg-white border border-slate-200 shadow-sm rounded-lg dark:bg-slate-900 dark:border-slate-700 transition-all duration-200 ${expanded ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
            >
                {/* Header Area */}
                <div className="flex items-center gap-0 list-none select-none">
                    {/* Drag Handle - Stays outside the clickable area for expansion */}
                    <div
                        {...attributes}
                        {...listeners}
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 cursor-grab active:cursor-grabbing p-3 -ml-1 h-full flex items-center"
                    >
                        <GripVertical size={16} />
                    </div>

                    {/* Clickable Area for Expansion */}
                    <div
                        onClick={() => onExpandChange(!expanded)}
                        className="flex-1 flex items-center gap-3 p-3 pl-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-r-lg"
                    >
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />

                        <div className="size-4 rounded-full flex-shrink-0 shadow-sm ring-1 ring-slate-300 dark:ring-slate-600" style={{ backgroundColor: slice.color }} />

                        <span className="text-sm font-light text-slate-800 dark:text-slate-200 flex-1">{slice.title || 'Untitled Slice'}</span>

                        {slice.sliceType && (
                            <span className="inline-flex items-center gap-x-1.5 py-1 px-2 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-white uppercase tracking-wider">
                                {slice.sliceType === SliceType.StateChange ? t('slices.command') :
                                    slice.sliceType === SliceType.StateView ? t('slices.view') :
                                        slice.sliceType === SliceType.Automation ? t('slices.auto') :
                                            slice.sliceType === SliceType.Integration ? t('slices.integration') :
                                                slice.sliceType}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                {expanded && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 rounded-b-lg">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
};


// Sub-component for a single Gherkin step with debounced input to prevent jumping
const SpecificationStepItem: React.FC<{
    step: SpecificationStep;
    section: 'given' | 'when' | 'then';
    onUpdate: (updates: Partial<SpecificationStep>) => void;
    onDelete: () => void;
    onAddNext: () => void;
    focusTarget?: string | null;
}> = ({ step, section, onUpdate, onDelete, onAddNext, focusTarget }) => {
    const { t } = useTranslation();
    const { value, onChange, onBlur, onFocus, onKeyDown } = useDebouncedInput(
        step.title,
        (val) => onUpdate({ title: val })
    );

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
    };

    return (
        <li className="flex items-start gap-1 group/step">
            <div className="w-[20px] flex justify-end mt-1.5 flex-shrink-0">
                <span className="text-slate-400 dark:text-slate-600 text-[10px]">•</span>
            </div>

            <Textarea
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                onFocus={onFocus}
                onInput={handleInput}
                autoFocus={step.id === focusTarget}
                ref={el => {
                    if (el) {
                        el.style.height = 'auto';
                        el.style.height = `${el.scrollHeight}px`;
                    }
                }}
                className="flex-1 text-sm text-slate-700 dark:text-slate-300 border border-transparent hover:border-blue-500/20 focus:border-blue-500/50 rounded-md px-2 py-1 bg-transparent focus:bg-white dark:focus:bg-slate-900/50 transition-all outline-none resize-none overflow-hidden placeholder:italic placeholder:text-slate-400/50 min-h-[28px]"
                placeholder={t('slices.describeStep', { step: t(`slices.${section}`) })}
                rows={1}
                onKeyDown={(e) => {
                    onKeyDown(e);
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onAddNext();
                    }
                }}
            />
            <button
                onClick={onDelete}
                className="text-slate-400 hover:text-red-500 opacity-0 group-hover/step:opacity-100 transition-opacity p-1 mt-0.5"
                tabIndex={-1}
            >
                <X size={14} />
            </button>
        </li>
    );
};

// Sub-component for a single Specification Item
const SpecificationItem: React.FC<{
    spec: Specification;
    onUpdate: (id: string, updates: Partial<Specification>) => void;
    onDelete: (id: string) => void;
}> = ({ spec, onUpdate, onDelete }) => {
    const { t } = useTranslation();
    const [deleteAnchorEl, setDeleteAnchorEl] = useState<HTMLElement | null>(null);
    const [focusTarget, setFocusTarget] = useState<string | null>(null);

    const {
        value: titleValue,
        onChange: onTitleChange,
        onBlur: onTitleBlur,
        onFocus: onTitleFocus,
        onKeyDown: onTitleKeyDown
    } = useDebouncedInput(
        spec.title,
        (val) => onUpdate(spec.id, { title: val })
    );

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

    const handleAddExampleColumn = () => {
        const currentHeaders = spec.examples?.headers || [t('slices.exampleHeader', { number: 1 })];
        const currentRows = spec.examples?.rows || [['']];
        const newHeaders = [...currentHeaders, t('slices.exampleHeader', { number: currentHeaders.length + 1 })];
        const newRows = currentRows.map(row => [...row, '']);
        onUpdate(spec.id, { examples: { headers: newHeaders, rows: newRows } });
    };

    const handleAddExampleRow = () => {
        const currentHeaders = spec.examples?.headers || [t('slices.exampleHeader', { number: 1 })];
        const currentRows = spec.examples?.rows || [];
        const newRow = new Array(currentHeaders.length).fill('');
        onUpdate(spec.id, {
            examples: {
                headers: currentHeaders,
                rows: [...currentRows, newRow]
            }
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
        <Accordion multiple className="mb-3">
            <AccordionItem value={spec.id} className="glass-card overflow-hidden border-none shadow-sm transition-all">
                <AccordionTrigger className="flex items-center justify-between px-4 py-3 hover:bg-white/10 dark:hover:bg-slate-800/50 no-underline hover:no-underline">
                    <div className="flex items-center gap-3 flex-1 text-left">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {spec.title || t('slices.specPlaceholder')}
                        </span>
                    </div>
                </AccordionTrigger>

                <AccordionContent className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-white/10 space-y-6">
                    <div className="flex justify-end -mt-2 mb-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeleteAnchorEl(e.currentTarget);
                            }}
                            className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                            title="Delete Specification"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>

                    <ConfirmMenu
                        open={Boolean(deleteAnchorEl)}
                        anchorEl={deleteAnchorEl}
                        onClose={() => setDeleteAnchorEl(null)}
                        onConfirm={() => onDelete(spec.id)}
                        message={t('slices.confirmDeleteSpec')}
                    />

                    <div>
                        <Label className="mb-2 px-1 uppercase tracking-widest text-[10px] text-slate-400 block font-bold">
                            {t('slices.specPlaceholder')}
                        </Label>
                        <Input
                            value={titleValue}
                            onChange={onTitleChange}
                            onBlur={onTitleBlur}
                            onFocus={onTitleFocus}
                            onKeyDown={onTitleKeyDown}
                            placeholder={t('slices.specPlaceholder')}
                            className="bg-white dark:bg-slate-900"
                        />
                    </div>
                    {(['given', 'when', 'then'] as const).map(section => {
                        const hasSteps = spec[section].length > 0;

                        if (!hasSteps) {
                            return (
                                <div key={section} className="flex justify-start">
                                    <button
                                        onClick={() => handleAddStep(section)}
                                        className="text-[10px] text-slate-400 hover:text-purple-500 hover:bg-purple-500/10 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500/30 transition-all font-bold uppercase tracking-wider"
                                    >
                                        + {t('slices.addStep', { step: t(`slices.${section}`) })}
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <div key={section} className="flex flex-col gap-2">
                                <div className="flex items-center justify-between group/section">
                                    <span className={`font-bold uppercase tracking-widest text-[10px] ${section === 'given' ? 'text-blue-500' :
                                        section === 'when' ? 'text-orange-500' : 'text-emerald-500'
                                        }`}>
                                        {t(`slices.${section}`)}
                                    </span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover/section:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleAddStep(section)}
                                            className="text-slate-400 hover:text-purple-500 p-1 rounded hover:bg-purple-500/10"
                                        >
                                            <Plus size={14} />
                                        </button>
                                        <button
                                            onClick={() => onUpdate(spec.id, { [section]: [] })}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-500/10"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <ul className="space-y-1">
                                    {spec[section].map((step) => (
                                        <SpecificationStepItem
                                            key={step.id}
                                            step={step}
                                            section={section}
                                            onUpdate={(updates) => handleUpdateStep(section, step.id, updates)}
                                            onDelete={() => handleDeleteStep(section, step.id)}
                                            onAddNext={() => handleAddStep(section, step.id)}
                                            focusTarget={focusTarget}
                                        />
                                    ))}
                                </ul>
                            </div>
                        );
                    })}

                    {/* Examples Section */}
                    <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
                        <Accordion multiple>
                            <AccordionItem value="examples" className="border-none">
                                <AccordionTrigger className="text-[10px] font-bold text-slate-400 uppercase tracking-widest no-underline hover:no-underline py-0 h-auto">
                                    {t('slices.examplesTitle')}
                                </AccordionTrigger>
                                <AccordionContent className="mt-4 pt-0">
                                    {!spec.examples ? (
                                        <button
                                            onClick={handleAddExampleRow}
                                            className="text-xs text-purple-500 hover:text-purple-600 underline font-medium"
                                        >
                                            {t('slices.createExamples')}
                                        </button>
                                    ) : (
                                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 shadow-sm">
                                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                                <thead className="bg-slate-50 dark:bg-slate-800">
                                                    <tr>
                                                        {(spec.examples.headers || []).map((header, i) => (
                                                            <th key={i} scope="col" className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider border-r border-slate-100 dark:border-slate-700 last:border-r-0">
                                                                <input
                                                                    type="text"
                                                                    value={t(header, { number: i + 1, defaultValue: header })}
                                                                    onChange={(e) => updateExampleHeader(i, e.target.value)}
                                                                    className="bg-transparent border-none w-full focus:ring-0 p-0 text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none"
                                                                    placeholder="VAR"
                                                                />
                                                            </th>
                                                        ))}
                                                        <th className="px-2 py-2 w-8">
                                                            <button onClick={handleAddExampleColumn} className="text-purple-500 hover:text-purple-600 font-bold" title="Add Column">+</button>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-transparent divide-y divide-slate-100 dark:divide-slate-700">
                                                    {(spec.examples.rows || []).map((row, rowIndex) => (
                                                        <tr key={rowIndex} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                                            {row.map((cell, colIndex) => (
                                                                <td key={colIndex} className="px-3 py-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-700 last:border-r-0">
                                                                    <input
                                                                        type="text"
                                                                        value={cell}
                                                                        onChange={(e) => updateExampleCell(rowIndex, colIndex, e.target.value)}
                                                                        className="bg-transparent border-none w-full focus:ring-0 p-0 text-xs text-slate-700 dark:text-slate-300 outline-none"
                                                                        placeholder="..."
                                                                    />
                                                                </td>
                                                            ))}
                                                            <td className="px-2 py-2"></td>
                                                        </tr>
                                                    ))}
                                                    <tr>
                                                        <td colSpan={100} className="px-3 py-2">
                                                            <button
                                                                onClick={handleAddExampleRow}
                                                                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-purple-500 transition-colors"
                                                            >
                                                                + {t('slices.addRow')}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};

// Sub-component for the expanded content of a Slice
const SliceItemContent: React.FC<{
    slice: Slice;
    onUpdateSlice: (id: string, updates: Partial<Slice>) => void;
    onDeleteSliceClick: (e: React.MouseEvent, id: string, anchor: HTMLElement) => void;
    onAddSpec: () => void;
}> = ({ slice, onUpdateSlice, onDeleteSliceClick, onAddSpec }) => {
    const { t } = useTranslation();

    const {
        value: titleValue,
        onChange: onTitleChange,
        onBlur: onTitleBlur,
        onFocus: onTitleFocus,
        onKeyDown: onTitleKeyDown
    } = useDebouncedInput(
        slice.title || '',
        (val) => onUpdateSlice(slice.id, { title: val })
    );

    const {
        value: contextValue,
        onChange: onContextChange,
        onBlur: onContextBlur,
        onFocus: onContextFocus,
        onKeyDown: onContextKeyDown
    } = useDebouncedInput(
        slice.context || '',
        (val) => onUpdateSlice(slice.id, { context: val })
    );

    return (
        <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col gap-4">
                <Input
                    id={`slice-name-input-${slice.id}`}
                    value={titleValue}
                    onChange={onTitleChange}
                    onBlur={onTitleBlur}
                    onFocus={onTitleFocus}
                    onKeyDown={onTitleKeyDown}
                    className="w-full text-base font-light bg-white dark:bg-slate-900"
                />
                <div className="grid grid-cols-1 gap-4 focus-within:ring-1 focus-within:ring-blue-500/20 rounded-xl transition-all">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <GlassSelect
                                label={t('slices.typeLabel') || 'Type'}
                                value={slice.sliceType || ''}
                                options={[
                                    { id: '', label: t('slices.none') },
                                    { id: SliceType.StateChange, label: t('slices.command'), icon: <MousePointer2 size={14} className="text-blue-500" /> },
                                    { id: SliceType.StateView, label: t('slices.view'), icon: <Eye size={14} className="text-green-500" /> },
                                    { id: SliceType.Automation, label: t('slices.auto'), icon: <Cpu size={14} className="text-purple-500" /> },
                                    { id: SliceType.Integration, label: t('slices.integration'), icon: <Network size={14} className="text-orange-500" /> },
                                ]}
                                onChange={(id) => onUpdateSlice(slice.id, { sliceType: id as SliceType || undefined })}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <GlassColorPicker
                                label={t('actors.color') || 'Color'}
                                color={slice.color || '#9333ea'}
                                onChange={(color) => onUpdateSlice(slice.id, { color })}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label className="ml-1 text-xs opacity-70">{t('slices.contextLabel')}</Label>
                        <Input
                            value={contextValue}
                            onChange={onContextChange}
                            onBlur={onContextBlur}
                            onFocus={onContextFocus}
                            onKeyDown={onContextKeyDown}
                            placeholder={t('slices.contextLabel')}
                            className="bg-white dark:bg-slate-900"
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e: React.MouseEvent) => onDeleteSliceClick(e, slice.id, e.currentTarget as HTMLElement)}
                        className="bg-red-600 hover:bg-red-500 text-white border-none"
                    >
                        <Trash2 size={14} className="mr-1 text-white" /> {t('slices.deleteSlice')}
                    </Button>
                </div>
            </div>

            <div className="h-px bg-slate-200 dark:bg-slate-700 mb-2"></div>

            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('slices.specificationsLabel')}</div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onAddSpec}
                        className="px-2 h-7 text-[10px] uppercase tracking-wider font-bold"
                    >
                        <Plus size={14} className="mr-1" /> {t('slices.addSpec')}
                    </Button>
                </div>

                <div className="space-y-3">
                    {(slice.specifications || []).length === 0 ? (
                        <div className="text-center py-6 px-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                            <p className="text-xs text-slate-400 italic mb-2">{t('slices.noSpecs')}</p>
                            <button
                                onClick={onAddSpec}
                                className="text-[10px] font-bold uppercase tracking-widest text-purple-500 hover:text-purple-600 transition-colors"
                            >
                                + {t('slices.addSpec')}
                            </button>
                        </div>
                    ) : (
                        (slice.specifications || []).map(spec => (
                            <SpecificationItem
                                key={spec.id}
                                spec={spec}
                                onUpdate={(id, updates) => {
                                    const updatedSpecs = (slice.specifications || []).map(s => s.id === id ? { ...s, ...updates } : s);
                                    onUpdateSlice(slice.id, { specifications: updatedSpecs });
                                }}
                                onDelete={(id) => {
                                    const updatedSpecs = (slice.specifications || []).filter(s => s.id !== id);
                                    onUpdateSlice(slice.id, { specifications: updatedSpecs });
                                }}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
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
    const { t } = useTranslation();
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
            .filter((s: any) => !localTitles.has(s.label.toLowerCase()))
            .map((s: any) => ({
                id: s.id,
                label: s.label,
                subLabel: t('slices.fromModel', { model: s.modelName }),
                group: t('slices.suggestions'),
                originalData: s
            }));
    }, [crossModelSlices, slices]);

    const handleAdd = (title: string, chapterName?: string) => {
        if (title.trim()) {
            const normalizedTitle = title.trim().toLowerCase();
            // Allow duplicate names if we are just creating a new chapter placeholder
            if (!chapterName && slices.some(s => s.title?.toLowerCase() === normalizedTitle)) {
                alert(t('slices.alreadyExists'));
                return;
            }
            // For new chapters, we might create a generic slice name.
            onAddSlice(title.trim(), slices.length);
        }
    };

    const handleCreateChapter = () => {
        const name = prompt(t('slices.enterChapterName'));
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
                        onCreate={(name: string) => handleAdd(name)}
                        placeholder={t('slices.addPlaceholder')}
                        allowCustomValue={false}
                        autoFocus={true}
                    />
                </div>
                <Button
                    variant="default"
                    size="sm"
                    onClick={handleCreateChapter}
                    title={t('slices.addChapter')}
                >
                    <Plus size={16} /> <span className="sr-only">Chapter</span>
                </Button>
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
                                            <SliceItemContent
                                                slice={slice}
                                                onUpdateSlice={onUpdateSlice}
                                                onDeleteSliceClick={(_e, id, anchor) => setDeleteSliceInfo({ id, anchorEl: anchor })}
                                                onAddSpec={() => {
                                                    const newSpec: Specification = {
                                                        id: uuidv4(),
                                                        title: t('slices.scenarioTitle', { number: (slice.specifications?.length || 0) + 1 }),
                                                        given: [],
                                                        when: [],
                                                        then: []
                                                    };
                                                    onUpdateSlice(slice.id, { specifications: [...(slice.specifications || []), newSpec] });
                                                }}
                                            />
                                        </SortableSliceItem>
                                    ))}
                                </SortableContext>
                            </SortableChapter>
                        ))}
                        {slices.length === 0 && (
                            <p className="text-center text-slate-500 pt-8 italic">{t('slices.noSlices')}</p>
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
                message={t('slices.confirmDeleteSlice')}
            />

            {/* Chapter Delete Menu */}
            <ConfirmMenu
                open={Boolean(deleteChapterInfo)}
                anchorEl={deleteChapterInfo?.anchorEl || null}
                onClose={() => setDeleteChapterInfo(null)}
                onConfirm={() => {
                    if (deleteChapterInfo) handleDeleteChapter(deleteChapterInfo.name, 'ungroup');
                }}
                message={t('slices.confirmDeleteChapter', { name: deleteChapterInfo?.name })}
                confirmLabel={t('slices.ungroupAll')}
            />
        </div>
    );
};

export default SliceList;
