import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
                        placeholder={t('actors.placeholder')}
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
                        className="hs-accordion group bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg overflow-hidden open:bg-gray-50 dark:open:bg-neutral-800 transition-all duration-200"
                    >
                        <summary className="hs-accordion-toggle flex items-center gap-3 p-3 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-neutral-800 select-none focus:outline-none">
                            <ChevronDown className="hs-accordion-active:rotate-180 text-gray-500 transition-transform duration-200" />
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-neutral-800 flex items-center justify-center text-gray-500 border border-gray-200 dark:border-neutral-700">
                                <Users size={16} />
                            </div>
                            <span className="font-medium text-gray-800 dark:text-neutral-100 flex-1">{actor.name}</span>
                        </summary>

                        <div className="p-4 bg-black/5 dark:bg-black/20 border-t border-white/10">
                            <div className="flex flex-col gap-4">
                                <GlassInput
                                    label={t('actors.name')}
                                    value={actor.name}
                                    onChange={(e) => onUpdateActor(actor.id, { name: e.target.value })}
                                />
                                 <div className="flex flex-col gap-1.5">
                                     <label className="text-sm font-medium text-gray-700 dark:text-neutral-300 ml-1">{t('actors.description')}</label>
                                     <textarea
                                         value={actor.description || ''}
                                         onChange={(e) => {
                                             onUpdateActor(actor.id, { description: e.target.value });
                                         }}
                                         placeholder={t('actors.description')}
                                         className="py-3 px-4 block w-full border-gray-200 dark:border-neutral-700 rounded-lg text-sm bg-white dark:bg-neutral-900 transition-all duration-200 text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-500 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none min-h-[80px]"
                                     />
                                 </div>

                                 <GlassInput
                                     label={t('actors.color')}
                                     type="color"
                                     value={actor.color || '#9333ea'}
                                     onChange={(e) => onUpdateActor(actor.id, { color: e.target.value })}
                                 />

                                <div className="flex justify-end pt-2">
                                    <GlassButton
                                        variant="danger"
                                        size="sm"
                                        onClick={(e) => setDeleteActorInfo({ id: actor.id, anchorEl: e.currentTarget })}
                                    >
                                        <Trash2 size={16} className="mr-1" /> {t('actors.delete')}
                                    </GlassButton>
                                </div>
                            </div>
                        </div>
                    </details>
                ))}
                {actors.length === 0 && (
                    <p className="text-center text-slate-500 pt-8 italic">{t('actors.noActors')}</p>
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
                message={t('actors.deleteConfirm')}
            />
        </div>
    );
};

export default ActorsList;
