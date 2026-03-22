import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Slice, SliceType } from '../../modeling';
import {
    FileText,
    ArrowLeft,
    Edit2,
    ArrowUp,
    ArrowDown,
    Trash2
} from 'lucide-react';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';
import { GlassButton } from '../../../shared/components/GlassButton';
import { GlassInput } from '../../../shared/components/GlassInput';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/components/ui/dialog";

interface SliceManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    slices: Slice[];
    onAddSlice: (title: string, order: number, type?: SliceType, context?: string) => void;
    onUpdateSlice: (id: string, updates: Partial<Slice>) => void;
    onDeleteSlice: (id: string) => void;
    initialViewingSpecsId?: string | null;
}

const SliceManagerModal: React.FC<SliceManagerModalProps> = ({
    isOpen,
    onClose,
    slices,
    onAddSlice,
    onUpdateSlice,
    onDeleteSlice,
    initialViewingSpecsId
}) => {
    const { t } = useTranslation();
    const [newSliceName, setNewSliceName] = useState('');
    const [newSliceType, setNewSliceType] = useState<SliceType | ''>('');
    const [newSliceContext, setNewSliceContext] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editType, setEditType] = useState<SliceType | ''>('');
    const [editContext, setEditContext] = useState('');

    const [viewingSpecsId, setViewingSpecsId] = useState<string | null>(initialViewingSpecsId || null);

    const [deleteAnchorEl, setDeleteAnchorEl] = useState<HTMLElement | null>(null);
    const [deleteSliceId, setDeleteSliceId] = useState<string | null>(null);

    const sortedSlices = [...slices].sort((a, b) => (a.order || 0) - (b.order || 0));

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSliceName.trim()) {
            onAddSlice(
                newSliceName.trim(),
                slices.length,
                newSliceType || undefined,
                newSliceContext.trim() || undefined
            );
            setNewSliceName('');
            setNewSliceType('');
            setNewSliceContext('');
        }
    };

    const startEditing = (slice: Slice) => {
        setEditingId(slice.id);
        setEditName(slice.title || '');
        setEditType(slice.sliceType || '');
        setEditContext(slice.context || '');
    };

    const saveEdit = () => {
        if (editingId && editName.trim()) {
            onUpdateSlice(editingId, {
                title: editName.trim(),
                sliceType: editType || undefined,
                context: editContext.trim() || undefined
            });
            setEditingId(null);
            setEditName('');
            setEditType('');
            setEditContext('');
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditType('');
        setEditContext('');
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        setDeleteSliceId(id);
        setDeleteAnchorEl(e.currentTarget as HTMLElement);
    };

    const confirmDelete = () => {
        if (deleteSliceId) {
            onDeleteSlice(deleteSliceId);
            setDeleteSliceId(null);
            setDeleteAnchorEl(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="glass-card w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden p-0 border-none shadow-2xl">
                <DialogHeader className="p-5 border-b border-gray-200/20 flex flex-row items-center gap-3">
                    {viewingSpecsId && (
                        <GlassButton 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setViewingSpecsId(null)} 
                            className="rounded-full p-2!"
                        >
                            <ArrowLeft size={20} />
                        </GlassButton>
                    )}
                    <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white">
                        {viewingSpecsId
                            ? t('editor.scenariosTitle', { name: slices.find(s => s.id === viewingSpecsId)?.title })
                            : t('editor.manageSlices')}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-grow overflow-y-auto p-5 space-y-3 custom-scrollbar">
                    {viewingSpecsId ? (
                        <div className="p-8 text-center text-slate-500 italic bg-purple-500/5 rounded-xl border border-dashed border-purple-500/20">
                            {t('editor.specsEditedInBottomPanel')}
                        </div>
                    ) : (
                        <>
                            {sortedSlices.length === 0 ? (
                                <p className="text-center text-slate-500 py-8 italic">{t('editor.noSlices')}</p>
                            ) : (
                                sortedSlices.map((slice) => (
                                    <div key={slice.id} className="flex items-center justify-between bg-white dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/5 group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        {editingId === slice.id ? (
                                            <div className="flex-grow flex flex-col gap-3">
                                                <GlassInput
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    placeholder={t('editor.sliceName')}
                                                    autoFocus
                                                />
                                                 <div className="flex gap-2">
                                                     <select
                                                         value={editType}
                                                         onChange={(e) => setEditType(e.target.value as SliceType)}
                                                         className="py-2.5 px-3 block w-full border-gray-200 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-900 transition-all duration-200 text-gray-800 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                                                     >
                                                         <option value="" className="bg-white dark:bg-neutral-900">{t('editor.type')}</option>
                                                         <option value={SliceType.StateChange} className="bg-white dark:bg-neutral-900">{t('editor.command')}</option>
                                                         <option value={SliceType.StateView} className="bg-white dark:bg-neutral-900">{t('editor.view')}</option>
                                                         <option value={SliceType.Automation} className="bg-white dark:bg-neutral-900">{t('editor.automation')}</option>
                                                     </select>
                                                     <input
                                                         type="text"
                                                         value={editContext}
                                                         onChange={(e) => setEditContext(e.target.value)}
                                                         className="py-2.5 px-3 block w-full border-gray-200 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-900 transition-all duration-200 text-gray-800 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                                                         placeholder={t('editor.boundedContext')}
                                                         onKeyDown={(e) => {
                                                             if (e.key === 'Enter') saveEdit();
                                                             if (e.key === 'Escape') cancelEdit();
                                                         }}
                                                     />
                                                 </div>
                                                <div className="flex gap-2 justify-end">
                                                    <GlassButton size="sm" onClick={saveEdit}>{t('common.save')}</GlassButton>
                                                    <GlassButton size="sm" variant="ghost" onClick={cancelEdit}>{t('common.cancel')}</GlassButton>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex-grow flex flex-col cursor-pointer" onClick={() => startEditing(slice)}>
                                                    <span className="font-medium text-slate-700 dark:text-slate-200 hover:text-purple-500 transition-colors truncate">
                                                        {slice.title}
                                                    </span>
                                                    <div className="flex gap-2 text-xs text-slate-500 mt-1">
                                                        {slice.sliceType && (
                                                            <span className="bg-slate-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">{slice.sliceType}</span>
                                                        )}
                                                        {slice.context && (
                                                            <span className="italic opacity-75">{slice.context}</span>
                                                        )}
                                                        {slice.specifications && slice.specifications.length > 0 && (
                                                            <span className="text-purple-500 flex items-center gap-0.5 font-medium" title={`${slice.specifications.length} scenarios`}>
                                                                <FileText size={12} /> {slice.specifications.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="flex flex-col -gap-1 mr-2 border-r border-white/10 pr-2">
                                                        <button
                                                            disabled={sortedSlices.indexOf(slice) === 0}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const idx = sortedSlices.indexOf(slice);
                                                                if (idx > 0) {
                                                                    const prev = sortedSlices[idx - 1];
                                                                    onUpdateSlice(slice.id, { order: idx - 1 });
                                                                    onUpdateSlice(prev.id, { order: idx });
                                                                }
                                                            }}
                                                            className="text-slate-400 hover:text-purple-500 disabled:opacity-20 transition-colors"
                                                            title={t('common.moveUp')}
                                                        >
                                                            <ArrowUp size={16} />
                                                        </button>
                                                        <button
                                                            disabled={sortedSlices.indexOf(slice) === sortedSlices.length - 1}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const idx = sortedSlices.indexOf(slice);
                                                                if (idx < sortedSlices.length - 1) {
                                                                    const next = sortedSlices[idx + 1];
                                                                    onUpdateSlice(slice.id, { order: idx + 1 });
                                                                    onUpdateSlice(next.id, { order: idx });
                                                                }
                                                            }}
                                                            className="text-slate-400 hover:text-purple-500 disabled:opacity-20 transition-colors"
                                                            title={t('common.moveDown')}
                                                        >
                                                            <ArrowDown size={16} />
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => setViewingSpecsId(slice.id)}
                                                        className="p-2 text-slate-400 hover:text-purple-500 rounded-lg hover:bg-purple-500/10 transition-colors"
                                                        title={t('common.manageScenarios')}
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => startEditing(slice)}
                                                        className="p-2 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-500/10 transition-colors"
                                                        title={t('common.rename')}
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(slice.id, e)}
                                                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </>
                    )}
                </div>

                {/* Footer / Add New */}
                {!viewingSpecsId && (
                    <div className="p-5 border-t border-gray-200/20 bg-slate-50/50 dark:bg-white/5">
                        <form onSubmit={handleAdd} className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                <GlassInput
                                    value={newSliceName}
                                    onChange={(e) => setNewSliceName(e.target.value)}
                                    placeholder={t('editor.newSliceName')}
                                    className="flex-grow"
                                />
                                <GlassButton type="submit" disabled={!newSliceName.trim()}>
                                    {t('common.add')}
                                </GlassButton>
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={newSliceType}
                                    onChange={(e) => setNewSliceType(e.target.value as SliceType)}
                                    className="py-2.5 px-3 block w-full border-slate-300 dark:border-white/10 rounded-xl text-sm bg-slate-50/50 dark:bg-black/20 backdrop-blur-md transition-all duration-200 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-purple-500/50 focus:ring-purple-500/50"
                                >
                                    <option value="">{t('editor.type')}</option>
                                    <option value={SliceType.StateChange}>{t('editor.command')}</option>
                                    <option value={SliceType.StateView}>{t('editor.view')}</option>
                                    <option value={SliceType.Automation}>{t('editor.automation')}</option>
                                </select>
                                <input
                                    type="text"
                                    value={newSliceContext}
                                    onChange={(e) => setNewSliceContext(e.target.value)}
                                    placeholder={t('editor.boundedContextOptional')}
                                    className="py-2.5 px-3 block w-full border-slate-300 dark:border-white/10 rounded-xl text-sm bg-slate-50/50 dark:bg-black/20 backdrop-blur-md transition-all duration-200 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-purple-500/50 focus:ring-purple-500/50"
                                />
                            </div>
                        </form>
                    </div>
                )}

                <ConfirmMenu
                    open={Boolean(deleteAnchorEl)}
                    onClose={() => setDeleteAnchorEl(null)}
                    onConfirm={confirmDelete}
                    message={t('editor.confirmDeleteSlice')}
                />
            </DialogContent>
        </Dialog>
    );
};

export default SliceManagerModal;
