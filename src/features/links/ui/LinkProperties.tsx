import React from 'react';
import { Trash2 } from 'lucide-react';
import { Link } from '../../modeling';
import { GlassButton } from '../../../shared/components/GlassButton';
import { GlassInput } from '../../../shared/components/GlassInput';
import { useDebouncedInput } from '../../../shared/hooks/useDebouncedInput';

interface LinkPropertiesProps {
    link: Link;
    onUpdateLink: <K extends keyof Link>(id: string, key: K, value: Link[K]) => void;
    onDeleteLink: (id: string) => void;
    nameInputRef: React.RefObject<HTMLInputElement | null>;
}

const LinkProperties: React.FC<LinkPropertiesProps> = ({ link, onUpdateLink, onDeleteLink, nameInputRef }) => {
    const labelInputGroup = useDebouncedInput(
        link.label || '',
        (val) => onUpdateLink(link.id, 'label', val)
    );

    return (
        <div className="flex flex-col gap-6">
            <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4">Relationship</h3>
                <GlassInput
                    label="Label"
                    {...labelInputGroup}
                    ref={nameInputRef}
                />
            </section>

            <div className="h-px bg-slate-200 dark:bg-white/10"></div>

            <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4">Actions</h3>
                <GlassButton
                    variant="danger"
                    size="sm"
                    onClick={() => onDeleteLink(link.id)}
                    className="w-full"
                >
                    <Trash2 size={16} className="mr-2" /> Delete Link
                </GlassButton>
            </section>
        </div>
    );
};

export default LinkProperties;
