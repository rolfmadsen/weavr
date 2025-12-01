import React, { useState, useMemo } from 'react';
import { Slice, DataDefinition } from '../types';
import {
    Delete as DeleteIcon,
    Edit as EditIcon,
    Check as CheckIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import SmartSelect from './SmartSelect';
import { useCrossModelData } from '../hooks/useCrossModelData';

interface SliceListProps {
    slices: Slice[];
    definitions: DataDefinition[];
    onAddSlice: (title: string, order: number) => void;
    onUpdateSlice: (id: string, updates: Partial<Slice>) => void;
    onDeleteSlice: (id: string) => void;
    modelId: string | null;
}

const SliceList: React.FC<SliceListProps> = ({
    slices,
    definitions,
    onAddSlice,
    onUpdateSlice,
    onDeleteSlice,
    modelId
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const { crossModelSlices } = useCrossModelData(modelId);

    const handleAdd = (title: string) => {
        if (title.trim()) {
            const normalizedTitle = title.trim().toLowerCase();
            // Check if already exists in Slices
            if (slices.some(s => s.title?.toLowerCase() === normalizedTitle)) {
                alert('Slice with this name already exists in this model.');
                return;
            }
            // Check if already exists in Definitions (Entities)
            if (definitions.some(d => d.name.toLowerCase() === normalizedTitle)) {
                alert('An Entity with this name already exists. Names must be unique across Slices and Entities.');
                return;
            }
            onAddSlice(title.trim(), slices.length);
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

    const handleAddSlice = (idOrName: string, option?: any) => {
        if (option) {
            // Selected an existing option (remote slice)
            handleAdd(option.label);
        } else if (idOrName) {
            // Created a new custom value
            handleAdd(idOrName);
        }
    };

    return (
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
            {/* Add New Slice */}
            <div className="flex items-center gap-2">
                <div className="flex-1">
                    <SmartSelect
                        options={remoteSliceOptions}
                        value=""
                        onChange={handleAddSlice}
                        onCreate={(name) => handleAdd(name)}
                        placeholder="Add or import slice..."
                        allowCustomValue={false}
                        autoFocus
                    />
                </div>
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
                                            e.stopPropagation();
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
