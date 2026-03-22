import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Actor } from '../../modeling';
import { Trash2, Plus, Users } from 'lucide-react';
import { GlassColorPicker } from '../../../shared/components/GlassColorPicker';
import ConfirmMenu from '../../../shared/components/ConfirmMenu';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Textarea } from '../../../shared/components/ui/textarea';
import { Label } from '../../../shared/components/ui/label';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "../../../shared/components/ui/accordion";


import { useDebouncedInput } from '../../../shared/hooks/useDebouncedInput';

interface ActorsListProps {
    actors: Actor[];
    onAddActor: (actor: { name: string; description: string; color: string }) => void;
    onUpdateActor: (id: string, changes: Partial<Actor>) => void;
    onRemoveActor: (id: string) => void;
}

const ActorItemContent: React.FC<{
    actor: Actor;
    onUpdateActor: (id: string, changes: Partial<Actor>) => void;
    onRemoveActor: (id: string) => void;
}> = ({ actor, onUpdateActor, onRemoveActor }) => {
    const { t } = useTranslation();
    const [deleteActorInfo, setDeleteActorInfo] = useState<{ id: string, anchorEl: HTMLElement } | null>(null);

    const {
        value: nameValue,
        onChange: onNameChange,
        onBlur: onNameBlur,
        onFocus: onNameFocus,
        onKeyDown: onNameKeyDown
    } = useDebouncedInput(
        actor.name,
        (val) => onUpdateActor(actor.id, { name: val })
    );

    const {
        value: descValue,
        onChange: onDescChange,
        onBlur: onDescBlur,
        onFocus: onDescFocus,
        onKeyDown: onDescKeyDown
    } = useDebouncedInput(
        actor.description || '',
        (val) => onUpdateActor(actor.id, { description: val })
    );

    return (
        <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
                <Label className="ml-1 text-xs opacity-70">{t('actors.name')}</Label>
                <Input
                    value={nameValue}
                    onChange={onNameChange}
                    onBlur={onNameBlur}
                    onFocus={onNameFocus}
                    onKeyDown={onNameKeyDown}
                    className="bg-white dark:bg-neutral-900 font-light"
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <Label className="ml-1 text-xs opacity-70">{t('actors.description')}</Label>
                <Textarea
                    value={descValue}
                    onChange={onDescChange}
                    onBlur={onDescBlur}
                    onFocus={onDescFocus}
                    onKeyDown={onDescKeyDown}
                    placeholder={t('actors.description')}
                    className="min-h-[80px] bg-white dark:bg-neutral-900 border-slate-200 dark:border-slate-700 font-light"
                />
            </div>

            <div className="space-y-1.5">
                <GlassColorPicker 
                    color={actor.color || '#9333ea'} 
                    onChange={(color) => onUpdateActor(actor.id, { color })} 
                />
            </div>

            <div className="flex justify-end pt-2">
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => setDeleteActorInfo({ id: actor.id, anchorEl: e.currentTarget })}
                    className="bg-red-600 hover:bg-red-500 text-white border-none"
                >
                    <Trash2 size={14} className="mr-1 text-white" /> {t('actors.delete')}
                </Button>
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

const ActorsList: React.FC<ActorsListProps> = ({
    actors,
    onAddActor,
    onUpdateActor,
    onRemoveActor
}) => {
    const { t } = useTranslation();
    const [newName, setNewName] = useState('');

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
                    <Input
                        placeholder={t('actors.placeholder')}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        className="font-light"
                    />
                    <Button 
                        onClick={handleAdd} 
                        disabled={!newName.trim()}
                        variant="glass-orange"
                        className="bg-orange-600 hover:bg-orange-500 text-white border-none shrink-0"
                    >
                        <Plus size={16} className="text-white" />
                    </Button>
                </div>
            </div>

            {/* List */}
            <Accordion multiple className="space-y-2">
                {actors.map((actor) => (
                    <AccordionItem
                        key={actor.id}
                        value={actor.id}
                        className="glass-card overflow-hidden border-none shadow-sm transition-all duration-200 rounded-xl"
                    >
                        <AccordionTrigger className="flex items-center gap-3 p-3 hover:bg-white/10 dark:hover:bg-neutral-800/80 no-underline hover:no-underline font-light group">
                            <div className="flex items-center gap-3 flex-1">
                                <div 
                                    className="size-8 rounded-full flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110"
                                    style={{ backgroundColor: actor.color || '#9333ea' }}
                                >
                                    <Users size={14} />
                                </div>
                                <span className="font-light text-slate-800 dark:text-neutral-100">{actor.name}</span>
                            </div>
                        </AccordionTrigger>

                        <AccordionContent className="p-4 bg-slate-50/50 dark:bg-black/20 border-t border-white/10">
                            <ActorItemContent 
                                actor={actor} 
                                onUpdateActor={onUpdateActor} 
                                onRemoveActor={onRemoveActor} 
                            />
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
            {actors.length === 0 && (
                <p className="text-center text-slate-500 pt-8 italic">{t('actors.noActors')}</p>
            )}
        </div>
    );
};

export default ActorsList;
