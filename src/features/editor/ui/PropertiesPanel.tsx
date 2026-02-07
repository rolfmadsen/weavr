import React, { useEffect, useMemo } from 'react';
import { Node, Link, DataDefinition } from '../../modeling';
import { useCrossModelData } from '../../modeling';
import { useModelingContext } from '../../modeling/store/ModelingContext';
import NodeProperties from '../../nodes/ui/NodeProperties';
import LinkProperties from '../../links/ui/LinkProperties';
import MultiNodeProperties from '../../nodes/ui/MultiNodeProperties';

interface PropertiesPanelProps {
  focusOnRender?: boolean;
  onFocusHandled?: () => void;
  modelId: string | null;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  focusOnRender,
  onFocusHandled,
  modelId
}) => {
  const store = useModelingContext();
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  const {
    crossModelSlices,
    crossModelDefinitions,
  } = useCrossModelData(modelId);

  const selectedItem = useMemo(() => {
    if (!store) return null;
    const { nodes, links, selectedNodeIdsArray, selectedLinkId } = store;

    if (selectedNodeIdsArray.length === 1 && !selectedLinkId) {
      const node = nodes.find((n: Node) => n.id === selectedNodeIdsArray[0]);
      return node ? { type: 'node' as const, data: node } : null;
    }
    if (selectedNodeIdsArray.length > 1 && !selectedLinkId) {
      const selectedNodes = nodes.filter((n: Node) => selectedNodeIdsArray.includes(n.id));
      return { type: 'multi-node' as const, data: selectedNodes };
    }
    if (selectedLinkId && selectedNodeIdsArray.length === 0) {
      const link = links.find((l: Link) => l.id === selectedLinkId);
      return link ? { type: 'link' as const, data: link } : null;
    }
    return null;
  }, [store]);

  useEffect(() => {
    if (focusOnRender && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
      onFocusHandled?.();
    }
  }, [focusOnRender, onFocusHandled, selectedItem]);

  if (!store || !selectedItem) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        <p>Select an item to view properties</p>
      </div>
    );
  }

  const onAddSliceWrapper = (title: string) => {
    // @ts-ignore
    return store.handleAddSlice(title) || '';
  }

  const onAddDefinitionWrapper = (def: Omit<DataDefinition, 'id'>) => {
    // @ts-ignore
    return store.addDefinition(def) || '';
  }

  if (selectedItem.type === 'node') {
    return (
      <NodeProperties
        node={selectedItem.data}
        onUpdateNode={store.handleUpdateNode}
        onDeleteNode={store.handleDeleteNode}
        slices={store.slices}
        onAddSlice={onAddSliceWrapper}
        definitions={store.definitions}
        onAddDefinition={onAddDefinitionWrapper}
        crossModelSlices={crossModelSlices}
        crossModelDefinitions={crossModelDefinitions}
        nameInputRef={nameInputRef}
        actors={store.actors}
        onAddActor={store.addActor}
        allNodes={store.nodes}
        allLinks={store.links}
      />
    );
  }

  if (selectedItem.type === 'link') {
    return (
      <LinkProperties
        link={selectedItem.data}
        onUpdateLink={store.handleUpdateLink}
        onDeleteLink={store.handleDeleteLink}
        nameInputRef={nameInputRef}
      />
    );
  }

  if (selectedItem.type === 'multi-node') {
    return (
      <MultiNodeProperties
        nodes={selectedItem.data}
        onUpdateNode={store.handleUpdateNode}
        onDeleteNode={store.handleDeleteNode}
        slices={store.slices}
        onAddSlice={onAddSliceWrapper}
        crossModelSlices={crossModelSlices}
        // @ts-ignore
        onPinSelection={store.handlePinSelection}
        // @ts-ignore
        onUnpinSelection={store.handleUnpinSelection}
        nameInputRef={nameInputRef}
      />
    );
  }

  return null;
};

export default PropertiesPanel;