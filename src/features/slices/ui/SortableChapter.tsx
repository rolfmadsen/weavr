import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
        <div ref={setNodeRef} style={style} className="mb-4">
            <div className="flex flex-col bg-white border border-slate-200 shadow-sm rounded-lg dark:bg-slate-900 dark:border-slate-700">
                <div className="flex items-center justify-between py-3 px-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 flex-grow min-w-0">
                        {/* Drag Handle */}
                        <div
                            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-400"
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical size={16} />
                        </div>

                        {/* Collapse Toggle */}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 p-0.5 rounded transition-transform"
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
                                    className="py-1 px-2 block w-full border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 dark:placeholder-slate-500 dark:focus:ring-slate-600 outline-none"
                                />
                                <button onMouseDown={handleRenameSubmit} className="text-green-500 hover:text-green-600"><Check size={16} /></button>
                                <button onClick={() => setIsEditing(false)} className="text-red-500 hover:text-red-600"><X size={16} /></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 group/title cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {chapterName}
                                </span>
                                <span className="inline-flex items-center py-0.5 px-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white">
                                    {slices.length}
                                </span>

                                {!isGeneral && onRename && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditName(chapterName);
                                            setIsEditing(true);
                                        }}
                                        className="opacity-0 group-hover/title:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity p-1"
                                        title={t('modelList.rename')}
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {!isGeneral && onDelete && !isEditing && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity px-4 pb-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(chapterName, 'ungroup');
                            }}
                            className="inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent text-red-600 hover:text-red-800 focus:outline-none focus:text-red-800 disabled:opacity-50 disabled:pointer-events-none dark:text-red-500 dark:hover:text-red-400 dark:focus:text-red-400"
                            title={t('slices.ungroupAll')}
                        >
                            <Trash2 size={14} />
                            {t('slices.ungroupAll')}
                        </button>
                    </div>
                )}
            </div>
            
            {!isCollapsed && (
                <div className="pl-4 border-l-2 border-slate-100 dark:border-white/5 ml-2 mt-2 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};
