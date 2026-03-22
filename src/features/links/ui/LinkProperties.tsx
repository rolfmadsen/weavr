import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Link } from '../../modeling';
import { GlassButton } from '../../../shared/components/GlassButton';
import { GlassInput } from '../../../shared/components/GlassInput';
import { useDebouncedInput } from '../../../shared/hooks/useDebouncedInput';
import { Label } from '../../../shared/components/ui/label';

interface LinkPropertiesProps {
    link: Link;
    onUpdateLink: <K extends keyof Link>(id: string, key: K, value: Link[K]) => void;
    onDeleteLink: (id: string) => void;
    nameInputRef: React.RefObject<any>;
}

const LinkProperties: React.FC<LinkPropertiesProps> = ({ link, onUpdateLink, onDeleteLink, nameInputRef }) => {
    const { t } = useTranslation();
    const labelInputGroup = useDebouncedInput(
        link.label || '',
        (val) => onUpdateLink(link.id, 'label', val)
    );

    return (
        <div className="flex flex-col gap-6">
            <section>
                <Label className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {t('properties.relationship')}
                </Label>
                <GlassInput
                    label={t('properties.label')}
                    {...labelInputGroup}
                    ref={nameInputRef}
                />
            </section>

            <div className="h-px bg-slate-200 dark:bg-white/10"></div>

            <section>
                <Label className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {t('properties.actions')}
                </Label>
                <GlassButton
                    variant="danger"
                    size="sm"
                    onClick={() => onDeleteLink(link.id)}
                    className="w-full"
                >
                    <Trash2 size={16} className="mr-2" /> {t('properties.deleteLink')}
                </GlassButton>
            </section>
        </div>
    );
};

export default LinkProperties;
