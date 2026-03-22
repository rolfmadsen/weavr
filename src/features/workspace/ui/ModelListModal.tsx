import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useModelList } from '../../modeling';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/components/ui/dialog";
import { cn } from "@/shared/lib/utils";

interface ModelListModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentModelId: string | null;
}

const ModelListModal: React.FC<ModelListModalProps> = ({ isOpen, onClose, currentModelId }) => {
    const { t, i18n } = useTranslation();
    const { models, addModel, updateModel, removeModel } = useModelList();
    const [isCreating, setIsCreating] = useState(false);
    const [newModelName, setNewModelName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const [deleteAnchorEl, setDeleteAnchorEl] = useState<HTMLElement | null>(null);
    const [deleteModelId, setDeleteModelId] = useState<string | null>(null);

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
        e.preventDefault();
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
        return new Date(timestamp).toLocaleDateString(i18n.language, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="glass-card w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0 border-none shadow-2xl">
                <DialogHeader className="p-6 border-b border-gray-200/50 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-md flex flex-row items-center justify-between">
                    <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-white">
                        {t('modelList.title')}
                    </DialogTitle>
                </DialogHeader>

                <div className="bg-blue-500/5 border-b border-blue-500/10 px-6 py-3 backdrop-blur-sm">
                    <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                        <span className="text-lg">💾</span>
                        <span>
                            {t('modelList.browserCacheWarning')}
                            <br />
                            <span className="font-semibold text-xs opacity-75">
                                {t('modelList.exportTip')}
                            </span>
                        </span>
                    </p>
                </div>

                <div className="p-6 overflow-y-auto text-slate-700 dark:text-slate-300 space-y-4 custom-scrollbar">
                    {/* Create New Section */}
                    <div className="bg-slate-50/50 dark:bg-black/20 p-4 rounded-xl border border-slate-200/50 dark:border-white/5">
                        {!isCreating ? (
                            <Button
                                variant="ghost"
                                onClick={() => setIsCreating(true)}
                                className="w-full justify-start gap-2 text-purple-600 dark:text-purple-300 font-bold hover:bg-purple-500/10"
                            >
                                <Plus size={16} />
                                {t('modelList.createNewModel')}
                            </Button>
                        ) : (
                            <div className="flex gap-2 items-center">
                                <Input
                                    value={newModelName}
                                    onChange={e => setNewModelName(e.target.value)}
                                    placeholder={t('modelList.enterModelName')}
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                    className="flex-1"
                                />
                                <Button onClick={handleCreate} size="sm">{t('modelList.create')}</Button>
                                <Button variant="ghost" onClick={() => setIsCreating(false)} size="sm">{t('common.cancel')}</Button>
                            </div>
                        )}
                    </div>

                    {/* List Section */}
                    <div className="space-y-2">
                        {models.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">{t('modelList.noModelsFound')}</p>
                        ) : (
                            models.sort((a, b) => b.updatedAt - a.updatedAt).map(model => (
                                <div
                                    key={model.id}
                                    onClick={() => handleSwitch(model.id)}
                                    className={cn(
                                        "group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer shadow-sm outline-none",
                                        model.id === currentModelId
                                            ? 'bg-purple-500/10 border-purple-500/30'
                                            : 'bg-white/40 dark:bg-slate-800/40 border-slate-200/50 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 hover:border-purple-500/30'
                                    )}
                                >
                                    <div className="flex-1 min-w-0 mr-4">
                                        {editingId === model.id ? (
                                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                <Input
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
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    onClick={(e) => startEditing(model.id, model.name, e)}
                                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-purple-600 transition-opacity p-0 h-auto"
                                                    title={t('modelList.rename')}
                                                >
                                                    <Edit2 size={12} />
                                                </Button>
                                                {model.id === currentModelId && (
                                                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full">{t('modelList.current')}</span>
                                                )}
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-500 mt-1">
                                            {t('modelList.lastModified')}: {formatDate(model.updatedAt)}
                                        </p>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={(e) => handleDelete(model.id, e)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-full"
                                        title={t('modelList.removeFromList')}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <ConfirmMenu
                    open={Boolean(deleteAnchorEl)}
                    onClose={() => setDeleteAnchorEl(null)}
                    onConfirm={confirmDelete}
                    message={t('modelList.confirmDelete')}
                />
            </DialogContent>
        </Dialog>
    );
};

export default ModelListModal;
