import React, { useState } from 'react';
import { Slice } from '../types';
import { PlusIcon, DeleteIcon, EditIcon, CheckIcon, CloseIcon } from './icons';

interface SliceListProps {
    slices: Slice[];
    onAddSlice: (title: string, order: number) => void;
    onUpdateSlice: (id: string, updates: Partial<Slice>) => void;
    onDeleteSlice: (id: string) => void;
}

const SliceList: React.FC<SliceListProps> = ({
    slices,
    onAddSlice,
    onUpdateSlice,
    onDeleteSlice
}) => {
    const [newSliceName, setNewSliceName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const handleAdd = () => {
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
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    return (
        <div className="space-y-4">
            {/* Add New Slice */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newSliceName}
                    onChange={(e) => setNewSliceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="New Slice Name..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                    onClick={handleAdd}
                    disabled={!newSliceName.trim()}
                    className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <PlusIcon className="text-xl" />
                </button>
            </div>

            {/* List */}
            <div className="space-y-2">
                {slices.map((slice) => (
                    <div
                        key={slice.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-indigo-200 transition-colors group"
                    >
                        {editingId === slice.id ? (
                            <div className="flex flex-col gap-2 flex-1">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveEdit();
                                            if (e.key === 'Escape') cancelEdit();
                                        }}
                                        className="flex-1 px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        autoFocus
                                    />
                                    <button onClick={saveEdit} className="text-green-600 hover:text-green-700">
                                        <CheckIcon className="text-base" />
                                    </button>
                                    <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                                        <CloseIcon className="text-base" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 font-mono">ID:</span>
                                    <input
                                        type="text"
                                        readOnly
                                        value={slice.id}
                                        className="flex-1 px-2 py-0.5 text-xs bg-gray-50 border border-gray-200 rounded text-gray-500 font-mono select-all"
                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: slice.color }}
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        {slice.title || 'Untitled Slice'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEditing(slice)}
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                                    >
                                        <EditIcon className="text-base" />
                                    </button>
                                    <button
                                        onClick={() => onDeleteSlice(slice.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                                    >
                                        <DeleteIcon className="text-base" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
                {slices.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No slices yet. Create one above!
                    </div>
                )}
            </div>
        </div>
    );
};

export default SliceList;
