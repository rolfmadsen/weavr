import React, { useState } from 'react';
import { Slice, SliceType } from '../../modeling';
import { CloseIcon, DeleteIcon } from '../../../shared/components/icons';
import { Description as DescriptionIcon, ArrowBack, Edit as EditIcon } from '@mui/icons-material';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';

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


    // Update state when initialViewingSpecsId changes (e.g. when reopening)
    React.useEffect(() => {
        if (isOpen && initialViewingSpecsId) {
            setViewingSpecsId(initialViewingSpecsId);
        } else if (isOpen && !initialViewingSpecsId) {
            setViewingSpecsId(null);
        }
    }, [isOpen, initialViewingSpecsId]);

    // Sort slices by order
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        {viewingSpecsId && (
                            <button onClick={() => setViewingSpecsId(null)} className="text-gray-500 hover:text-indigo-600">
                                <ArrowBack />
                            </button>
                        )}
                        <h2 className="text-lg font-bold text-gray-800">
                            {viewingSpecsId
                                ? `Scenarios: ${slices.find(s => s.id === viewingSpecsId)?.title}`
                                : 'Manage Slices'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100">
                        <CloseIcon />
                    </button>
                </div>

                {/* List */}
                {/* Content */}
                <div className="flex-grow overflow-y-auto p-4 space-y-2">
                    {viewingSpecsId ? (
                        <div className="p-4 text-center text-gray-500 italic">
                            Specifications are now edited in the bottom panel.
                        </div>
                    ) : (
                        <>
                            {sortedSlices.length === 0 ? (
                                <p className="text-center text-gray-500 py-8 italic">No slices created yet.</p>
                            ) : (
                                sortedSlices.map((slice) => (
                                    <div key={slice.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 group">
                                        {editingId === slice.id ? (
                                            <div className="flex-grow flex flex-col gap-2">
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="w-full px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-1"
                                                    placeholder="Slice Name"
                                                    autoFocus
                                                />
                                                <div className="flex gap-2">
                                                    <select
                                                        value={editType}
                                                        onChange={(e) => setEditType(e.target.value as SliceType)}
                                                        className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
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
                                                        className="flex-grow px-2 py-1 text-xs border border-gray-300 rounded"
                                                        placeholder="Bounded Context"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') saveEdit();
                                                            if (e.key === 'Escape') cancelEdit();
                                                        }}
                                                    />
                                                    <button onClick={saveEdit} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">Save</button>
                                                    <button onClick={cancelEdit} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex-grow flex flex-col cursor-pointer" onClick={() => startEditing(slice)}>
                                                    <span className="font-medium text-gray-700 hover:text-indigo-600 truncate">
                                                        {slice.title}
                                                    </span>
                                                    <div className="flex gap-2 text-xs text-gray-500">
                                                        {slice.sliceType && (
                                                            <span className="bg-gray-200 px-1 rounded text-gray-600">{slice.sliceType}</span>
                                                        )}
                                                        {slice.context && (
                                                            <span className="italic">{slice.context}</span>
                                                        )}
                                                        {slice.specifications && slice.specifications.length > 0 && (
                                                            <span className="text-indigo-500 flex items-center gap-0.5" title={`${slice.specifications.length} scenarios`}>
                                                                <DescriptionIcon style={{ fontSize: 12 }} /> {slice.specifications.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setViewingSpecsId(slice.id)}
                                                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                                                        title="Manage Scenarios (Given/When/Then)"
                                                    >
                                                        <DescriptionIcon style={{ fontSize: 14 }} />
                                                        Scenarios
                                                    </button>
                                                    <button
                                                        onClick={() => startEditing(slice)}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                                                        title="Rename"
                                                    >
                                                        <EditIcon style={{ fontSize: 14 }} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(slice.id, e)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                                                        title="Delete"
                                                    >
                                                        <DeleteIcon />
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

                {/* Footer / Add New - Only show when not viewing specs */}
                {!viewingSpecsId && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                        <form onSubmit={handleAdd} className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSliceName}
                                    onChange={(e) => setNewSliceName(e.target.value)}
                                    placeholder="New slice name..."
                                    className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!newSliceName.trim()}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={newSliceType}
                                    onChange={(e) => setNewSliceType(e.target.value as SliceType)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white text-sm"
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
                                    className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                                />
                            </div>
                        </form>
                    </div>
                )
                }

            </div >
            <ConfirmMenu
                anchorEl={deleteAnchorEl}
                open={Boolean(deleteAnchorEl)}
                onClose={() => setDeleteAnchorEl(null)}
                onConfirm={confirmDelete}
                message="Are you sure you want to delete this slice?"
            />
        </div >
    );
};

export default SliceManagerModal;
