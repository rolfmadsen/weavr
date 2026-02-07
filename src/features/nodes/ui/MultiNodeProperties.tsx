import React, { useMemo } from 'react';
import { Pin, PinOff, Trash2 } from 'lucide-react';
import { Node, Slice } from '../../modeling';
import { CrossModelItem } from '../../modeling/store/useCrossModelData';
import { GlassButton } from '../../../shared/components/GlassButton';
import SmartSelect from '../../../shared/components/SmartSelect';

interface MultiNodePropertiesProps {
    nodes: Node[];
    onUpdateNode: <K extends keyof Node>(id: string, key: K, value: Node[K]) => void;
    onDeleteNode: (id: string) => void;
    slices: Slice[];
    onAddSlice: (title: string) => string;
    crossModelSlices: CrossModelItem[];
    onPinSelection?: () => void;
    onUnpinSelection?: () => void;
    nameInputRef: React.RefObject<HTMLInputElement | null>;
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
    const sliceOptions = useMemo(() => {
        const localOptions = slices.map((s: any) => ({
            id: s.id,
            label: s.title || 'Untitled',
            color: s.color,
            group: 'Local Slices'
        }));

        const remoteOptions = crossModelSlices.map((s) => ({
            id: `remote:${s.id}:${s.label}`,
            label: s.label,
            subLabel: `From ${s.modelName}`,
            group: 'Suggestions',
            originalData: s
        }));

        return [...localOptions, ...remoteOptions];
    }, [slices, crossModelSlices]);

    const handleSliceCreate = (name: string) => {
        const existingSlice = slices.find((s) => (s.title || '').toLowerCase() === name.toLowerCase());
        if (existingSlice) {
            alert(`Slice "${existingSlice.title}" already exists.`);
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
                <h3 className="text-md font-bold text-slate-800 dark:text-white mb-1">{nodes.length} items selected</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Edit properties for all selected items.</p>
            </section>

            <div className="h-px bg-slate-200 dark:bg-white/10"></div>

            <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4">Batch Actions</h3>

                <div className="grid grid-cols-2 gap-2 mb-6">
                    <GlassButton variant="secondary" size="sm" onClick={onPinSelection} disabled={!onPinSelection}>
                        <Pin size={16} className="mr-1" /> Pin
                    </GlassButton>
                    <GlassButton variant="secondary" size="sm" onClick={onUnpinSelection} disabled={!onUnpinSelection}>
                        <PinOff size={16} className="mr-1" /> Unpin
                    </GlassButton>
                </div>

                <div className="mb-6">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 block">Assign to Slice</label>
                    <SmartSelect
                        options={sliceOptions}
                        value=""
                        onChange={handleSliceChange}
                        onCreate={handleSliceCreate}
                        placeholder="Select slice for all..."
                        allowCustomValue={false}
                        ref={nameInputRef}
                    />
                </div>

                <GlassButton variant="danger" onClick={() => nodes.forEach((n) => onDeleteNode(n.id))} className="w-full">
                    <Trash2 size={16} className="mr-2" /> Delete All Selected
                </GlassButton>
            </section>
        </div>
    );
};

export default MultiNodeProperties;
