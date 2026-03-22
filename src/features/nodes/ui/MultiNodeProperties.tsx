import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pin, PinOff, Trash2 } from 'lucide-react';
import { Node, Slice } from '../../modeling';
import { CrossModelItem } from '../../modeling/store/useCrossModelData';
import { GlassButton } from '../../../shared/components/GlassButton';
import SmartSelect from '../../../shared/components/SmartSelect';
import { Label } from '../../../shared/components/ui/label';

interface MultiNodePropertiesProps {
    nodes: Node[];
    onUpdateNode: <K extends keyof Node>(id: string, key: K, value: Node[K]) => void;
    onDeleteNode: (id: string) => void;
    slices: Slice[];
    onAddSlice: (title: string) => string;
    crossModelSlices: CrossModelItem[];
    onPinSelection?: () => void;
    onUnpinSelection?: () => void;
    nameInputRef: React.RefObject<any>;
}

const MultiNodeProperties: React.FC<MultiNodePropertiesProps> = ({
    nodes,
    onUpdateNode,
    onDeleteNode,
    slices,
    onAddSlice,
    crossModelSlices,
    onPinSelection,
    onUnpinSelection,
    nameInputRef
}) => {
    const { t } = useTranslation();
    const sliceOptions = useMemo(() => {
        const localOptions = slices.map((s: any) => ({
            id: s.id,
            label: s.title || t('common.untitled'),
            color: s.color,
            group: t('properties.slice')
        }));

        const remoteOptions = crossModelSlices.map((s) => ({
            id: `remote:${s.id}:${s.label}`,
            label: s.label,
            subLabel: t('modeling.fromModel', { modelName: s.modelName }),
            group: t('common.suggestions'),
            originalData: s
        }));

        return [...localOptions, ...remoteOptions];
    }, [slices, crossModelSlices]);

    const handleSliceCreate = (name: string) => {
        const existingSlice = slices.find((s) => (s.title || '').toLowerCase() === name.toLowerCase());
        if (existingSlice) {
            alert(t('properties.sliceExists', { name: existingSlice.title }));
            return existingSlice.id;
        }
        const newId = onAddSlice(name);
        return newId.toString();
    };

    const handleSliceChange = (id: string, option: any) => {
        let targetSliceId = id;
        if (id.startsWith('remote:') && option?.originalData) {
            const remoteSlice = option.originalData as CrossModelItem;
            const existingLocal = slices.find((s) => (s.title || '').toLowerCase() === remoteSlice.label.toLowerCase());
            if (existingLocal) {
                targetSliceId = existingLocal.id;
            } else {
                const newId = onAddSlice(remoteSlice.label);
                targetSliceId = newId.toString();
            }
        }
        nodes.forEach((node) => {
            onUpdateNode(node.id, 'sliceId', targetSliceId || undefined);
        });
    };

    return (
        <div className="flex flex-col gap-6">
            <section>
                <h3 className="text-md font-bold text-slate-800 dark:text-white mb-1">{t('properties.itemsSelected', { count: nodes.length })}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t('properties.editAllSelected')}</p>
            </section>

            <div className="h-px bg-slate-200 dark:bg-white/10"></div>

            <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4">{t('properties.batchActions')}</h3>

                <div className="grid grid-cols-2 gap-2 mb-6">
                    <GlassButton variant="secondary" size="sm" onClick={onPinSelection} disabled={!onPinSelection}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
                    >
                        <Pin size={16} className="mr-1" /> {t('properties.pin')}
                    </GlassButton>
                    <GlassButton variant="secondary" size="sm" onClick={onUnpinSelection} disabled={!onUnpinSelection}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
                    >
                        <PinOff size={16} className="mr-1" /> {t('properties.unpin')}
                    </GlassButton>
                </div>

                <div className="mb-6">
                    <Label className="mb-2 block">{t('properties.assignToSlice')}</Label>
                    <SmartSelect
                        options={sliceOptions}
                        value=""
                        onChange={handleSliceChange}
                        onCreate={handleSliceCreate}
                        placeholder={t('properties.placeholders.selectSliceForAll')}
                        allowCustomValue={false}
                        ref={nameInputRef}
                    />
                </div>

                <GlassButton variant="danger" onClick={() => nodes.forEach((n) => onDeleteNode(n.id))} className="w-full">
                    <Trash2 size={16} className="mr-2" /> {t('properties.deleteAllSelected')}
                </GlassButton>
            </section>
        </div>
    );
};

export default MultiNodeProperties;
