import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useModelList } from '../../modeling';
import { CloseIcon, PlusIcon, DeleteIcon } from '../../../shared/components/icons';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';

interface ModelListModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentModelId: string | null;
}

const ModelListModal: React.FC<ModelListModalProps> = ({ isOpen, onClose, currentModelId }) => {
    const { models, addModel, updateModel, removeModel } = useModelList();
    const [isCreating, setIsCreating] = useState(false);
    const [newModelName, setNewModelName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const [deleteAnchorEl, setDeleteAnchorEl] = useState<HTMLElement | null>(null);
    const [deleteModelId, setDeleteModelId] = useState<string | null>(null);


    if (!isOpen) return null;

    const handleCreate = () => {
        if (!newModelName.trim()) return;
        const newId = uuidv4();
        addModel(newId, newModelName.trim());
        window.location.hash = newId;
        setNewModelName('');
        setIsCreating(false);
        onClose();
    };

    const handleSwitch = (id: string) => {
        window.location.hash = id;
        onClose();
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteModelId(id);
        setDeleteAnchorEl(e.currentTarget as HTMLElement);
    };

    const confirmDelete = () => {
        if (deleteModelId) {
            removeModel(deleteModelId);
            setDeleteModelId(null);
            setDeleteAnchorEl(null);
        }
    };

    const startEditing = (id: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(id);
        setEditName(name);
    };

    const saveEditing = (id: string) => {
        if (editName.trim()) {
            updateModel(id, { name: editName.trim() });
        }
        setEditingId(null);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">My Models</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-200">
                        <CloseIcon />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto text-gray-700 space-y-4">
                    {/* Create New Section */}
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        {!isCreating ? (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="w-full flex items-center justify-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
                            >
                                <PlusIcon className="text-xl" />
                                Create New Model
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newModelName}
                                    onChange={e => setNewModelName(e.target.value)}
                                    placeholder="Enter model name..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                />
                                <button
                                    onClick={handleCreate}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700"
                                >
                                    Create
                                </button>
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="text-gray-500 px-4 py-2 hover:text-gray-700"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    {/* List Section */}
                    <div className="space-y-2">
                        {models.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No models found. Create one to get started!</p>
                        ) : (
                            models.sort((a, b) => b.updatedAt - a.updatedAt).map(model => (
                                <div
                                    key={model.id}
                                    onClick={() => handleSwitch(model.id)}
                                    className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${model.id === currentModelId
                                        ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200'
                                        : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0 mr-4">
                                        {editingId === model.id ? (
                                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    autoFocus
                                                    onBlur={() => saveEditing(model.id)}
                                                    onKeyDown={e => e.key === 'Enter' && saveEditing(model.id)}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-gray-800 truncate">{model.name}</h3>
                                                <button
                                                    onClick={(e) => startEditing(model.id, model.name, e)}
                                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition-opacity p-1"
                                                    title="Rename"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                </button>
                                                {model.id === currentModelId && (
                                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">Current</span>
                                                )}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1">
                                            Last modified: {formatDate(model.updatedAt)}
                                        </p>
                                    </div>

                                    <button
                                        onClick={(e) => handleDelete(model.id, e)}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-all"
                                        title="Remove from list"
                                    >
                                        <DeleteIcon className="text-lg" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <ConfirmMenu
                anchorEl={deleteAnchorEl}
                open={Boolean(deleteAnchorEl)}
                onClose={() => setDeleteAnchorEl(null)}
                onConfirm={confirmDelete}
                message="Are you sure you want to remove this model from your list?"
            />
        </div>
    );
};

export default ModelListModal;
