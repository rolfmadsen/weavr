import React, { useState } from 'react';
import { Actor } from '../../modeling';
import { Trash2, ChevronDown, Plus, Users } from 'lucide-react';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';
import { GlassButton } from '../../../shared/components/GlassButton';
import { GlassInput } from '../../../shared/components/GlassInput';

interface ActorsListProps {
    actors: Actor[];
    onAddActor: (actor: { name: string; description: string; color: string }) => void;
    onUpdateActor: (id: string, changes: Partial<Actor>) => void;
    onRemoveActor: (id: string) => void;
}

const ActorsList: React.FC<ActorsListProps> = ({
    actors,
    onAddActor,
    onUpdateActor,
    onRemoveActor
}) => {
    const [newName, setNewName] = useState('');
    const [deleteActorInfo, setDeleteActorInfo] = useState<{ id: string, anchorEl: HTMLElement } | null>(null);

    const handleAdd = () => {
        if (!newName.trim()) return;
        onAddActor({
            name: newName,
            description: '',
            color: '#9333ea' // Default Purple
        });
        setNewName('');
    };

    return (
        <div className="pb-24">
            {/* Add New Actor */}
            <div className="mb-4">
                <div className="flex gap-2">
                    <GlassInput
                        placeholder="New Actor Name..."
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <GlassButton onClick={handleAdd} disabled={!newName.trim()}>
                        <Plus size={20} />
                    </GlassButton>
                </div>
            </div>

            {/* List */}
            <div className="space-y-1">
                {actors.map((actor) => (
                    <details
                        key={actor.id}
                        className="hs-accordion group bg-white/5 border border-white/10 rounded-lg overflow-hidden open:bg-white/10 open:border-white/20 transition-all duration-200"
                    >
                        <summary className="hs-accordion-toggle flex items-center gap-3 p-3 cursor-pointer list-none hover:bg-white/5 select-none focus:outline-none">
                            <ChevronDown className="hs-accordion-active:rotate-180 text-slate-500 transition-transform duration-200" />
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                <Users size={16} />
                            </div>
                            <span className="font-medium text-slate-800 dark:text-slate-100 flex-1">{actor.name}</span>
                        </summary>

                        <div className="p-4 bg-black/5 dark:bg-black/20 border-t border-white/10">
                            <div className="flex flex-col gap-4">
                                <GlassInput
                                    label="Name"
                                    value={actor.name}
                                    onChange={(e) => onUpdateActor(actor.id, { name: e.target.value })}
                                />
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Description</label>
                                    <textarea
                                        value={actor.description || ''}
                                        onChange={(e) => {
                                            onUpdateActor(actor.id, { description: e.target.value });
                                        }}
                                        className="py-2 px-3 block w-full border-slate-300 dark:border-white/10 rounded-xl text-sm bg-slate-50/50 dark:bg-black/20 focus:border-purple-500/50 focus:ring-purple-500/50 dark:focus:ring-neutral-600 disabled:opacity-50 disabled:pointer-events-none min-h-[60px]"
                                    />
                                </div>

                                <GlassInput
                                    label="Color"
                                    type="color"
                                    value={actor.color || '#9333ea'}
                                    onChange={(e) => onUpdateActor(actor.id, { color: e.target.value })}
                                    className="p-1 h-10 block w-full border-slate-300 dark:border-white/10 rounded-xl bg-white dark:bg-black/20 cursor-pointer focus:border-purple-500/50 focus:ring-purple-500/50 dark:focus:ring-neutral-600 disabled:opacity-50 disabled:pointer-events-none"
                                />

                                <div className="flex justify-end pt-2">
                                    <GlassButton
                                        variant="danger"
                                        size="sm"
                                        onClick={(e) => setDeleteActorInfo({ id: actor.id, anchorEl: e.currentTarget })}
                                    >
                                        <Trash2 size={16} className="mr-1" /> Delete
                                    </GlassButton>
                                </div>
                            </div>
                        </div>
                    </details>
                ))}
                {actors.length === 0 && (
                    <p className="text-center text-slate-500 pt-8 italic">No actors defined yet.</p>
                )}
            </div>

            <ConfirmMenu
                open={Boolean(deleteActorInfo)}
                anchorEl={deleteActorInfo?.anchorEl || null}
                onClose={() => setDeleteActorInfo(null)}
                onConfirm={() => {
                    if (deleteActorInfo) {
                        onRemoveActor(deleteActorInfo.id);
                        setDeleteActorInfo(null);
                    }
                }}
                message="Delete this actor?"
            />
        </div>
    );
};

export default ActorsList;
