import React, { useState } from 'react';
import { Slice } from '../../modeling';
import { CloseIcon, DeleteIcon } from '../../../shared/components/icons';

interface SliceManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    slices: Slice[];
    onAddSlice: (title: string, order: number) => void;
    onUpdateSlice: (id: string, updates: Partial<Slice>) => void;
    onDeleteSlice: (id: string) => void;
}

const SliceManagerModal: React.FC<SliceManagerModalProps> = ({
    isOpen,
    onClose,
    slices,
    onAddSlice,
    onUpdateSlice,
    onDeleteSlice,
}) => {
    const [newSliceName, setNewSliceName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    // Sort slices by order
    const sortedSlices = [...slices].sort((a, b) => (a.order || 0) - (b.order || 0));

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSliceName.trim()) {
            onAddSlice(newSliceName.trim(), slices.length);
            setNewSliceName('');
        }
    };

    const startEditing = (slice: Slice) => {
        setEditingId(slice.id);
        setEditName(slice.title || '');
    };

    const saveEdit = () => {
        if (editingId && editName.trim()) {
            onUpdateSlice(editingId, { title: editName.trim() });
            setEditingId(null);
            setEditName('');
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this slice?')) {
            onDeleteSlice(id);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800">Manage Slices</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100">
                        <CloseIcon />
                    </button>
                </div>

                {/* List */}
                <div className="flex-grow overflow-y-auto p-4 space-y-2">
                    {sortedSlices.length === 0 ? (
                        <p className="text-center text-gray-500 py-8 italic">No slices created yet.</p>
                    ) : (
                        sortedSlices.map((slice) => (
                            <div key={slice.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 group">
                                {editingId === slice.id ? (
                                    <div className="flex-grow flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="flex-grow px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveEdit();
                                                if (e.key === 'Escape') cancelEdit();
                                            }}
                                        />
                                        <button onClick={saveEdit} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">Save</button>
                                        <button onClick={cancelEdit} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">Cancel</button>
                                    </div>
                                ) : (
                                    <>
                                        <span
                                            className="font-medium text-gray-700 cursor-pointer hover:text-indigo-600 truncate flex-grow"
                                            onClick={() => startEditing(slice)}
                                            title="Click to rename"
                                        >
                                            {slice.title}
                                        </span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEditing(slice)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                                                title="Rename"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(slice.id)}
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
                </div>

                {/* Footer / Add New */}
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <form onSubmit={handleAdd} className="flex gap-2">
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
                    </form>
                </div>

            </div>
        </div>
    );
};

export default SliceManagerModal;
