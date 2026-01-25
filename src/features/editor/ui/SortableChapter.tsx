import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Edit2, GripVertical, ChevronDown, Check, X } from 'lucide-react';
import { Slice } from '../../modeling/domain/types';

interface SortableChapterProps {
    id: string; // "chapter:{name}"
    chapterName: string;
    slices: Slice[];
    children: React.ReactNode;
    onDelete?: (chapterName: string, mode: 'ungroup' | 'delete') => void;
    onRename?: (oldName: string, newName: string) => void;
}

export const SortableChapter: React.FC<SortableChapterProps> = ({
    id,
    chapterName,
    slices,
    children,
    onDelete,
    onRename
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isGeneral = chapterName === 'General';
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(chapterName);

    const handleRenameSubmit = () => {
        if (editName.trim() && editName !== chapterName && onRename) {
            onRename(chapterName, editName.trim());
        }
        setIsEditing(false);
    };

    return (
        <div ref={setNodeRef} style={style} className="mb-6">
            <div className="flex items-center justify-between bg-slate-100 dark:bg-white/5 px-2 py-2 rounded-lg mb-2 group border border-transparent hover:border-slate-300 dark:hover:border-white/10 transition-colors">
                <div className="flex items-center gap-2 flex-grow min-w-0">
                    {/* Drag Handle */}
                    <div
                        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical size={16} />
                    </div>

                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-transform"
                    >
                        <ChevronDown size={16} className={`transform transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>

                    {/* Title / Edit Mode */}
                    {isEditing ? (
                        <div className="flex items-center gap-1 flex-grow">
                            <input
                                autoFocus
                                type="text"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleRenameSubmit();
                                    if (e.key === 'Escape') setIsEditing(false);
                                }}
                                onBlur={handleRenameSubmit}
                                className="bg-white dark:bg-black/20 border border-purple-500 rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 w-full min-w-[100px] outline-none"
                            />
                            <button onMouseDown={handleRenameSubmit} className="text-green-500 hover:text-green-600"><Check size={14} /></button>
                            <button onClick={() => setIsEditing(false)} className="text-red-500 hover:text-red-600"><X size={14} /></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group/title cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 truncate">
                                {chapterName}
                            </span>
                            <span className="text-slate-400 font-normal text-xs">({slices.length})</span>

                            {!isGeneral && onRename && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditName(chapterName);
                                        setIsEditing(true);
                                    }}
                                    className="opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-purple-400 transition-opacity p-1"
                                    title="Rename Chapter"
                                >
                                    <Edit2 size={12} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {!isGeneral && onDelete && !isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(chapterName, 'ungroup');
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                            title="Ungroup Slices"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>

            {!isCollapsed && (
                <div className="pl-2 border-l-2 border-slate-100 dark:border-white/5 ml-1.5 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};
