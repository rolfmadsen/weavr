import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useModelList } from '../../modeling';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';
import { GlassCard } from '../../../shared/components/GlassCard';
import { GlassButton } from '../../../shared/components/GlassButton';
import { GlassInput } from '../../../shared/components/GlassInput';

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
            const isDeletingCurrent = deleteModelId === currentModelId;
            removeModel(deleteModelId);

            if (isDeletingCurrent) {
                const remainingModels = models
                    .filter(m => m.id !== deleteModelId)
                    .sort((a, b) => b.updatedAt - a.updatedAt);

                if (remainingModels.length > 0) {
                    window.location.hash = remainingModels[0].id;
                } else {
                    window.location.hash = uuidv4();
                }
            }
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
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={onClose}>
            <GlassCard
                variant="panel"
                className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-md">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">My Models</h2>
                    <GlassButton variant="ghost" size="sm" onClick={onClose} className="rounded-full !p-2">
                        <X size={20} />
                    </GlassButton>
                </div>

                <div className="bg-blue-500/5 border-b border-blue-500/10 px-6 py-3 backdrop-blur-sm">
                    <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                        <span className="text-lg">💾</span>
                        <span>
                            These models live in your <strong>browser cache</strong>.
                            Clearing your history/cache will remove them.
                            <br />
                            <span className="font-semibold text-xs opacity-75">
                                Tip: Export important models as backups.
                            </span>
                        </span>
                    </p>
                </div>

                <div className="p-6 overflow-y-auto text-slate-700 dark:text-slate-300 space-y-4 custom-scrollbar">
                    {/* Create New Section */}
                    <div className="bg-slate-50/50 dark:bg-black/20 p-4 rounded-xl border border-slate-200/50 dark:border-white/5">
                        {!isCreating ? (
                            <GlassButton
                                variant="ghost"
                                onClick={() => setIsCreating(true)}
                                className="w-full !justify-start gap-2 text-purple-600 dark:text-purple-300 font-bold hover:bg-purple-500/10"
                            >
                                <Plus size={20} className="text-xl" />
                                Create New Model
                            </GlassButton>
                        ) : (
                            <div className="flex gap-2 items-center">
                                <GlassInput
                                    value={newModelName}
                                    onChange={e => setNewModelName(e.target.value)}
                                    placeholder="Enter model name..."
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                    className="flex-1"
                                />
                                <GlassButton onClick={handleCreate} size="md">Create</GlassButton>
                                <GlassButton variant="ghost" onClick={() => setIsCreating(false)} size="md">Cancel</GlassButton>
                            </div>
                        )}
                    </div>

                    {/* List Section */}
                    <div className="space-y-2">
                        {models.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">No models found. Create one to get started!</p>
                        ) : (
                            models.sort((a, b) => b.updatedAt - a.updatedAt).map(model => (
                                <div
                                    key={model.id}
                                    onClick={() => handleSwitch(model.id)}
                                    className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${model.id === currentModelId
                                        ? 'bg-purple-500/10 border-purple-500/30 ring-1 ring-purple-500/30'
                                        : 'bg-white/40 dark:bg-slate-800/40 border-slate-200/50 dark:border-white/10 hover:bg-white/60 dark:hover:bg-slate-700/50 hover:border-purple-500/30 shadow-sm'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0 mr-4">
                                        {editingId === model.id ? (
                                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                <GlassInput
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    autoFocus
                                                    onBlur={() => saveEditing(model.id)}
                                                    onKeyDown={e => e.key === 'Enter' && saveEditing(model.id)}
                                                    className="w-full"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate">{model.name}</h3>
                                                <button
                                                    onClick={(e) => startEditing(model.id, model.name, e)}
                                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-purple-600 transition-opacity p-1"
                                                    title="Rename"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                {model.id === currentModelId && (
                                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full">Current</span>
                                                )}
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-500 mt-1">
                                            Last modified: {formatDate(model.updatedAt)}
                                        </p>
                                    </div>

                                    <GlassButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleDelete(model.id, e)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-500/10 !p-2 rounded-full"
                                        title="Remove from list"
                                    >
                                        <Trash2 size={20} />
                                    </GlassButton>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </GlassCard>

            <ConfirmMenu
                anchorEl={deleteAnchorEl}
                open={Boolean(deleteAnchorEl)}
                onClose={() => setDeleteAnchorEl(null)}
                onConfirm={confirmDelete}
                message="Are you sure you want to remove this model from your list?"
            />
        </div >
    );
};

export default ModelListModal;
