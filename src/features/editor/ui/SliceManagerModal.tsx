import React, { useState, useEffect } from 'react';
import { Slice, SliceType } from '../../modeling';
import {
    FileText,
    ArrowLeft,
    Edit2,
    ArrowUp,
    ArrowDown,
    X,
    Trash2
} from 'lucide-react';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';
import { GlassCard } from '../../../shared/components/GlassCard';
import { GlassButton } from '../../../shared/components/GlassButton';
import { GlassInput } from '../../../shared/components/GlassInput';

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


    useEffect(() => {
        if (isOpen && initialViewingSpecsId) {
            setViewingSpecsId(initialViewingSpecsId);
        } else if (isOpen && !initialViewingSpecsId) {
            setViewingSpecsId(null);
        }
    }, [isOpen, initialViewingSpecsId]);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <GlassCard
                variant="panel"
                className="w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-200/20">
                    <div className="flex items-center gap-3">
                        {viewingSpecsId && (
                            <GlassButton variant="ghost" size="sm" onClick={() => setViewingSpecsId(null)} className="rounded-full !p-2">
                                <ArrowLeft size={20} />
                            </GlassButton>
                        )}
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                            {viewingSpecsId
                                ? `Scenarios: ${slices.find(s => s.id === viewingSpecsId)?.title}`
                                : 'Manage Slices'}
                        </h2>
                    </div>
                    <GlassButton variant="ghost" size="sm" onClick={onClose} className="rounded-full !p-2">
                        <X size={20} />
                    </GlassButton>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-5 space-y-3 custom-scrollbar">
                    {viewingSpecsId ? (
                        <div className="p-8 text-center text-slate-500 italic bg-white/5 rounded-xl border border-dotted border-white/20">
                            Specifications are now edited in the bottom panel.
                        </div>
                    ) : (
                        <>
                            {sortedSlices.length === 0 ? (
                                <p className="text-center text-slate-500 py-8 italic">No slices created yet.</p>
                            ) : (
                                sortedSlices.map((slice) => (
                                    <div key={slice.id} className="flex items-center justify-between bg-white/40 dark:bg-black/20 p-3 rounded-xl border border-white/20 dark:border-white/5 group hover:bg-white/60 dark:hover:bg-white/5 transition-colors">
                                        {editingId === slice.id ? (
                                            <div className="flex-grow flex flex-col gap-3">
                                                <GlassInput
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    placeholder="Slice Name"
                                                    autoFocus
                                                />
                                                <div className="flex gap-2">
                                                    <select
                                                        value={editType}
                                                        onChange={(e) => setEditType(e.target.value as SliceType)}
                                                        className="px-3 py-2 text-xs border border-white/20 rounded-lg bg-white/50 dark:bg-black/50 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-purple-500"
                                                    >
                                                        <option value="">Type...</option>
                                                        <option value={SliceType.StateChange}>Command</option>
                                                        <option value={SliceType.StateView}>View</option>
                                                        <option value={SliceType.Automation}>Automation</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={editContext}
                                                        onChange={(e) => setEditContext(e.target.value)}
                                                        className="flex-grow px-3 py-2 text-xs border border-white/20 rounded-lg bg-white/50 dark:bg-black/50 text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-purple-500"
                                                        placeholder="Bounded Context"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') saveEdit();
                                                            if (e.key === 'Escape') cancelEdit();
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex gap-2 justify-end">
                                                    <GlassButton size="sm" onClick={saveEdit}>Save</GlassButton>
                                                    <GlassButton size="sm" variant="ghost" onClick={cancelEdit}>Cancel</GlassButton>
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
                                                            disabled={slices.indexOf(slice) === 0}
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
                                                            title="Move Up"
                                                        >
                                                            <ArrowUp size={16} />
                                                        </button>
                                                        <button
                                                            disabled={slices.indexOf(slice) === slices.length - 1}
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
                                                            title="Move Down"
                                                        >
                                                            <ArrowDown size={16} />
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => setViewingSpecsId(slice.id)}
                                                        className="p-2 text-slate-400 hover:text-purple-500 rounded-lg hover:bg-purple-500/10 transition-colors"
                                                        title="Manage Scenarios"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => startEditing(slice)}
                                                        className="p-2 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-500/10 transition-colors"
                                                        title="Rename"
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
                                    placeholder="New slice name..."
                                    className="flex-grow"
                                />
                                <GlassButton type="submit" disabled={!newSliceName.trim()}>
                                    Add
                                </GlassButton>
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={newSliceType}
                                    onChange={(e) => setNewSliceType(e.target.value as SliceType)}
                                    className="px-3 py-2.5 border border-white/20 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 bg-white/40 dark:bg-black/20 backdrop-blur-md text-sm text-slate-700 dark:text-slate-200"
                                >
                                    <option value="">Type...</option>
                                    <option value={SliceType.StateChange}>Command</option>
                                    <option value={SliceType.StateView}>View</option>
                                    <option value={SliceType.Automation}>Automation</option>
                                </select>
                                <input
                                    type="text"
                                    value={newSliceContext}
                                    onChange={(e) => setNewSliceContext(e.target.value)}
                                    placeholder="Bounded Context (Optional)..."
                                    className="flex-grow px-3 py-2.5 border border-white/20 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 bg-white/40 dark:bg-black/20 backdrop-blur-md text-sm text-slate-700 dark:text-slate-200"
                                />
                            </div>
                        </form>
                    </div>
                )}

            </GlassCard>
            <ConfirmMenu
                anchorEl={deleteAnchorEl}
                open={Boolean(deleteAnchorEl)}
                onClose={() => setDeleteAnchorEl(null)}
                onConfirm={confirmDelete}
                message="Are you sure you want to delete this slice?"
            />
        </div>
    );
};

export default SliceManagerModal;
