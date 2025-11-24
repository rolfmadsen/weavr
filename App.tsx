import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import GraphCanvasKonva from './components/GraphCanvasKonva';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import Header from './components/Header';
import Footer from './components/Footer';
import HelpModal from './components/HelpModal';
import WelcomeModal from './components/WelcomeModal';
import { Node, Link, ElementType, ModelData } from './types';
import validationService from './services/validationService';
import sliceService from './services/sliceService';
import layoutService from './services/layoutService';
import gunService from './services/gunService';
import { useGunState } from './hooks/useGunState';
import { useSelection } from './hooks/useSelection';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useHistory } from './hooks/useHistory';

function getModelIdFromUrl(): string {
  const hash = window.location.hash.slice(1);
  if (hash) return hash;
  const newId = uuidv4();
  window.location.hash = newId;
  return newId;
}

const App: React.FC = () => {
  const [modelId, setModelId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [focusOnRender, setFocusOnRender] = useState(false);
  const [showSlices, setShowSlices] = useState(false);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [experimentalLayoutEnabled, setExperimentalLayoutEnabled] = useState(false); // Added state

  // Track view state (pan/zoom) for smart node placement
  const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
  const graphRef = React.useRef<any>(null);
  const [isLayoutLoading, setIsLayoutLoading] = useState(false);

  // NEW: Store explicit edge paths from ELK
  const [autoLayoutEdges, setAutoLayoutEdges] = useState<Map<string, number[]>>(new Map());

  // 1. Gun State Management
  const {
    nodes,
    links,
    isReady,
    manualPositionsRef,
    addNode: gunAddNode,
    updateNode: gunUpdateNode,
    deleteNode: gunDeleteNode,
    addLink: gunAddLink,
    updateLink: gunUpdateLink,
    deleteLink: gunDeleteLink,
    updateNodePosition: gunUpdateNodePosition
  } = useGunState(modelId);

  // 2. Selection Management
  const {
    selectedNodeIds,
    selectedLinkId,
    selectNode,
    selectLink,
    clearSelection,
    setSelection
  } = useSelection();

  // 3. History (Undo/Redo)
  const { undo, redo, addToHistory, canUndo, canRedo } = useHistory({
    onAddNode: gunAddNode,
    onDeleteNode: gunDeleteNode,
    onUpdateNode: gunUpdateNode,
    onAddLink: gunAddLink,
    onDeleteLink: gunDeleteLink,
    onUpdateLink: gunUpdateLink,
    onMoveNode: gunUpdateNodePosition
  });

  // --- Effects ---

  useEffect(() => {
    if (isReady && nodes.length === 0 && localStorage.getItem('weavr-welcome-shown') !== 'true') {
      setIsWelcomeModalOpen(true);
    }
  }, [isReady, nodes]);

  useEffect(() => {
    const id = getModelIdFromUrl();
    setModelId(id);

    const handleHashChange = () => {
      window.location.reload();
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);


  // --- Handlers ---

  const handleClosePanel = useCallback(() => {
    if (document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }
    setIsPanelOpen(false);
  }, []);

  // Smart Add: Places node in the center of the current view
  const handleAddNode = useCallback((type: ElementType, explicitId?: string) => {
    // Calculate center of current view in world coordinates
    const centerX = (window.innerWidth / 2 - viewState.x) / viewState.scale;
    const centerY = (window.innerHeight / 2 - viewState.y) / viewState.scale;

    // Adjust for Top-Left anchor (subtract half width/height)
    // We use MIN_NODE_HEIGHT as a default since we don't know the exact text height yet
    let manualX = centerX - 80; // NODE_WIDTH / 2
    let manualY = centerY - 30; // MIN_NODE_HEIGHT / 2

    // Snap to grid (20px)
    const GRID = 20;
    manualX = Math.round(manualX / GRID) * GRID;
    manualY = Math.round(manualY / GRID) * GRID;

    const id = gunAddNode(type, manualX, manualY, explicitId);
    if (id) {
      addToHistory({ type: 'ADD_NODE', payload: { id, type, x: manualX, y: manualY }, undoPayload: { id } });
      selectNode(id);
      setIsPanelOpen(true);
      setFocusOnRender(true);
      setIsToolbarOpen(false);
    }
  }, [gunAddNode, addToHistory, selectNode, viewState]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const connectedLinks = links.filter(l => l.source === nodeId || l.target === nodeId);

    gunDeleteNode(nodeId);
    addToHistory({
      type: 'DELETE_NODE',
      payload: { id: nodeId },
      undoPayload: { node, links: connectedLinks }
    });

    if (selectedNodeIds.includes(nodeId)) {
      setSelection(selectedNodeIds.filter(id => id !== nodeId));
    }
    handleClosePanel();
  }, [nodes, links, gunDeleteNode, addToHistory, selectedNodeIds, setSelection, handleClosePanel]);

  const handleDeleteLink = useCallback((linkId: string) => {
    const link = links.find(l => l.id === linkId);
    if (!link) return;

    gunDeleteLink(linkId);
    addToHistory({
      type: 'DELETE_LINK',
      payload: { id: linkId },
      undoPayload: link
    });

    if (selectedLinkId === linkId) {
      clearSelection();
    }
    handleClosePanel();
  }, [links, gunDeleteLink, addToHistory, selectedLinkId, clearSelection, handleClosePanel]);

  const handleDeleteSelection = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      selectedNodeIds.forEach(nodeId => handleDeleteNode(nodeId));
    }
    if (selectedLinkId) {
      handleDeleteLink(selectedLinkId);
    }
    handleClosePanel();
  }, [selectedNodeIds, selectedLinkId, handleDeleteNode, handleDeleteLink, handleClosePanel]);

  const handleNodesDrag = useCallback((updates: { nodeId: string; pos: { x: number; y: number } }[]) => {
    if (showSlices) return;

    // If user manually drags, we clear the rigid ELK edge paths so lines behave naturally again
    if (autoLayoutEdges.size > 0) {
      setAutoLayoutEdges(new Map());
    }

    updates.forEach(({ nodeId, pos }) => {
      const node = nodes.find(n => n.id === nodeId);
      const oldPos = node ? { x: node.fx ?? node.x, y: node.fy ?? node.y } : { x: 0, y: 0 };

      gunUpdateNodePosition(nodeId, pos.x, pos.y);

      if (Math.abs(oldPos.x! - pos.x) > 1 || Math.abs(oldPos.y! - pos.y) > 1) {
        addToHistory({
          type: 'MOVE_NODE',
          payload: { id: nodeId, x: pos.x, y: pos.y },
          undoPayload: { id: nodeId, x: oldPos.x, y: oldPos.y }
        });
      }
    });
  }, [showSlices, nodes, gunUpdateNodePosition, addToHistory, autoLayoutEdges]);

  const handleNodeClick = useCallback((node: Node, event: any) => {
    const isMulti = event?.evt?.shiftKey || event?.shiftKey;
    if (isMulti) {
      selectNode(node.id, true);
      return;
    }
    if (selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id)) {
      return;
    }
    selectNode(node.id);
    setIsPanelOpen(false);
    setIsToolbarOpen(false);
  }, [selectedNodeIds, selectNode]);

  const handleFocusNode = useCallback(() => {
    if (selectedNodeIds.length === 1 && graphRef.current) {
      graphRef.current.panToNode(selectedNodeIds[0]);
    }
  }, [selectedNodeIds]);

  const handleOpenPropertiesPanel = useCallback(() => {
    if (selectedNodeIds.length === 1 || selectedLinkId) {
      setIsPanelOpen(true);
      setFocusOnRender(true);
      setIsToolbarOpen(false);
    }
  }, [selectedNodeIds, selectedLinkId]);

  // --- Calculated Slices & Swimlanes ---
  const { slices, swimlanePositions } = useMemo(() => {
    if (!showSlices || nodes.length === 0) {
      return { slices: [], swimlanePositions: new Map() };
    }
    const { slices: rawSlices } = sliceService.calculateSlices(nodes, links);

    // Calculate auto-layout for slice view
    let layoutResult;
    if (experimentalLayoutEnabled) {
      layoutResult = layoutService.calculateZonedSliceLayout(rawSlices, nodes, links, window.innerWidth);
    } else {
      layoutResult = layoutService.calculateSwimlaneLayout(rawSlices, nodes, links, window.innerWidth);
    }

    const { nodePositions, sliceBounds } = layoutResult;

    // Merge bounds into slices
    const slicesWithBounds = rawSlices.map(slice => {
      const bounds = sliceBounds.get(slice.id);
      if (bounds) {
        return { ...slice, ...bounds };
      }
      return slice;
    });

    return { slices: slicesWithBounds, swimlanePositions: nodePositions };
  }, [showSlices, nodes, links, experimentalLayoutEnabled]);

  // --- Auto Layout Handler (ELK) ---
  const handleAutoLayout = useCallback(async () => {
    if (nodes.length === 0) return;
    if (showSlices) return; // Disable Auto Layout when Slices are active
    setIsLayoutLoading(true);

    try {
      // 1. Snapshot the CURRENT (Old) positions before we change them
      const oldPositions = nodes.map(n => ({
        id: n.id,
        x: n.fx ?? n.x, // Use fixed position if available, else current x
        y: n.fy ?? n.y
      }));

      const { calculateElkLayout } = await import('./services/elkLayoutService');

      // 2. Get new positions (returns Map directly now)
      const newPositionsMap = await calculateElkLayout(nodes, links, slices);

      console.log(`Auto-layout calculated for ${newPositionsMap.size} nodes.`);

      // 3. Prepare the NEW positions array for history
      const newPositions: { id: string, x: number, y: number }[] = [];

      // 4. Update GunDB
      newPositionsMap.forEach((pos, nodeId) => {
        // Extra safety check for ID
        if (!nodeId || nodeId.length === 0) return;

        // Save to GunDB - Pass RAW float values (pos.x, pos.y)
        gunUpdateNodePosition(nodeId, pos.x, pos.y);

        // Add to our history tracker
        newPositions.push({ id: nodeId, x: pos.x, y: pos.y });
      });

      // 5. ONE History Entry for the entire operation (Batch)
      addToHistory({
        type: 'BATCH_MOVE',
        payload: newPositions,      // When Redoing: move all these to new
        undoPayload: oldPositions   // When Undoing: move all these to old
      });

    } catch (error) {
      console.error("Auto-layout failed:", error);
    } finally {
      setIsLayoutLoading(false);
    }
  }, [nodes, links, slices, gunUpdateNodePosition, addToHistory, showSlices]);

  // --- Keyboard Shortcuts ---
  useKeyboardShortcuts({
    nodes,
    selectedNodeIds,
    selectedLinkId,
    isPanelOpen,
    isToolbarOpen,
    isReady,
    showSlices,
    swimlanePositions,
    onDeleteSelection: handleDeleteSelection,
    onClosePanel: handleClosePanel,
    onToggleToolbar: () => setIsToolbarOpen(prev => !prev),
    onOpenPropertiesPanel: handleOpenPropertiesPanel,
    onSelectNode: handleNodeClick,
    onAddNode: handleAddNode,
    onMoveNodes: (updates) => {
      updates.forEach((pos, id) => {
        const node = nodes.find(n => n.id === id);
        const oldPos = node ? { x: node.fx ?? node.x, y: node.fy ?? node.y } : { x: 0, y: 0 };
        gunUpdateNodePosition(id, pos.fx, pos.fy);
        addToHistory({
          type: 'MOVE_NODE',
          payload: { id, x: pos.fx, y: pos.fy },
          undoPayload: { id, x: oldPos.x, y: oldPos.y }
        });
      });
    },
    // @ts-ignore
    onFocusNode: handleFocusNode
  });

  const handleToggleSlices = useCallback(() => {
    setShowSlices(prev => !prev);
    setAutoLayoutEdges(new Map()); // Clear explicit routes on toggle
  }, []);

  const handleLinkClick = useCallback((link: Link) => {
    selectLink(link.id);
    setIsPanelOpen(false);
    setIsToolbarOpen(false);
  }, [selectLink]);

  const handleNodeDoubleClick = useCallback((node: Node) => {
    selectNode(node.id);
    handleOpenPropertiesPanel();
  }, [selectNode, handleOpenPropertiesPanel]);

  const handleLinkDoubleClick = useCallback((link: Link) => {
    selectLink(link.id);
    handleOpenPropertiesPanel();
  }, [selectLink, handleOpenPropertiesPanel]);

  const handleMarqueeSelect = useCallback((nodeIds: string[]) => {
    setSelection(nodeIds);
    setIsPanelOpen(false);
  }, [setSelection]);

  const handleValidateConnection = useCallback((s: Node, t: Node) => {
    return !!validationService.isValidConnection(s, t);
  }, []);

  const handleAddLink = useCallback((sourceId: string, targetId: string) => {
    if (!modelId || sourceId === targetId) return;
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);

    if (!sourceNode || !targetNode) return;
    const rule = validationService.getConnectionRule(sourceNode, targetNode);
    if (!rule) return;
    if (links.some(l => l.source === sourceId && l.target === targetId)) return;

    const id = gunAddLink(sourceId, targetId, rule.verb);
    if (id) {
      addToHistory({
        type: 'ADD_LINK',
        payload: { id, source: sourceId, target: targetId, label: rule.verb },
        undoPayload: { id }
      });
      selectLink(id);
      setIsPanelOpen(true);
      setFocusOnRender(true);
    }
  }, [nodes, links, modelId, gunAddLink, addToHistory, selectLink]);

  const handleUpdateNode = useCallback((nodeId: string, key: string, value: any) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const oldValue = (node as any)[key];
    gunUpdateNode(nodeId, { [key]: value });

    addToHistory({
      type: 'UPDATE_NODE',
      payload: { id: nodeId, data: { [key]: value } },
      undoPayload: { [key]: oldValue }
    });
  }, [nodes, gunUpdateNode, addToHistory]);

  const handleUpdateLink = useCallback((linkId: string, key: string, value: any) => {
    const link = links.find(l => l.id === linkId);
    if (!link) return;
    const oldValue = (link as any)[key];

    gunUpdateLink(linkId, { [key]: value });
    addToHistory({
      type: 'UPDATE_LINK',
      payload: { id: linkId, data: { [key]: value } },
      undoPayload: { [key]: oldValue }
    });
  }, [links, gunUpdateLink, addToHistory]);

  const handleExport = useCallback(() => {
    const data: ModelData = { nodes, links };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-model-${modelId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, links, modelId]);

  const handleImport = useCallback((file: File) => {
    if (!modelId) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') throw new Error('File read error');
        const data: ModelData = JSON.parse(result);
        if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) throw new Error('Invalid file format');

        const model = gunService.getModel(modelId);

        nodes.forEach(n => model.get('nodes').get(n.id).put(null as any));
        links.forEach(l => model.get('links').get(l.id).put(null as any));
        manualPositionsRef.current.clear();

        (data.nodes || []).forEach(node => {
          const { id, ...nodeData } = node;
          model.get('nodes').get(id).put(nodeData as any);
          if (node.fx != null && node.fy != null) {
            manualPositionsRef.current.set(id, { x: node.fx, y: node.fy });
          }
        });
        (data.links || []).forEach(link => {
          const { id, ...linkData } = link;
          model.get('links').get(id).put(linkData as any);
        });

        clearSelection();
        handleClosePanel();
      } catch (error) {
        alert('Failed to import model: ' + (error as Error).message);
      }
    };
    reader.readAsText(file);
  }, [modelId, nodes, links, handleClosePanel, clearSelection, manualPositionsRef]);

  const handleCanvasClick = useCallback((event: any) => {
    const shiftKey = event.shiftKey || event.evt?.shiftKey;
    if (!shiftKey) {
      clearSelection();
      handleClosePanel();
      setIsToolbarOpen(false);
    }
  }, [handleClosePanel, clearSelection]);

  const handleFocusHandled = useCallback(() => setFocusOnRender(false), []);

  const handleCloseWelcomeModal = useCallback(() => {
    setIsWelcomeModalOpen(false);
    localStorage.setItem('weavr-welcome-shown', 'true');
  }, []);

  const selectedItemData = useMemo(() => {
    if (selectedNodeIds.length === 1 && !selectedLinkId) {
      const node = nodes.find(n => n.id === selectedNodeIds[0]);
      return node ? { type: 'node' as const, data: node } : null;
    }
    if (selectedLinkId && selectedNodeIds.length === 0) {
      const link = links.find(l => l.id === selectedLinkId);
      return link ? { type: 'link' as const, data: link } : null;
    }
    return null;
  }, [selectedNodeIds, selectedLinkId, nodes, links]);

  const selectedIds = useMemo(() => {
    return selectedLinkId ? [...selectedNodeIds, selectedLinkId] : selectedNodeIds;
  }, [selectedNodeIds, selectedLinkId]);

  return (
    <div className="w-screen h-[100dvh] overflow-hidden relative font-sans">
      <Header
        onImport={handleImport}
        onExport={handleExport}
        onToggleSlices={handleToggleSlices}
        slicesVisible={showSlices}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onAutoLayout={handleAutoLayout}
        isAutoLayoutDisabled={showSlices}
        onToggleExperimentalLayout={() => setExperimentalLayoutEnabled(!experimentalLayoutEnabled)}
        experimentalLayoutEnabled={experimentalLayoutEnabled}
      />
      <div className={isLayoutLoading ? 'cursor-wait' : ''}></div>
      <GraphCanvasKonva
        nodes={nodes}
        links={links}
        selectedIds={selectedIds}
        slices={slices}
        swimlanePositions={swimlanePositions}
        showSlices={showSlices}
        experimentalLayoutEnabled={experimentalLayoutEnabled} // <-- Passed here
        edgeRoutes={autoLayoutEdges} // <-- Passed here
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onLinkDoubleClick={handleLinkDoubleClick}
        onNodesDrag={handleNodesDrag}
        onAddLink={handleAddLink}
        onCanvasClick={handleCanvasClick}
        onMarqueeSelect={handleMarqueeSelect}
        onValidateConnection={handleValidateConnection}
        onViewChange={setViewState}
        ref={graphRef}
      />

      <Toolbar
        onAddNode={handleAddNode}
        disabled={!isReady}
        isMenuOpen={isToolbarOpen}
        onToggleMenu={() => setIsToolbarOpen(prev => !prev)}
      />

      {isPanelOpen && selectedItemData && <div onClick={handleClosePanel} className="fixed inset-0 bg-black/30 z-20 md:hidden" />}

      <div className={`fixed bottom-0 left-0 right-0 h-[85vh] md:top-0 md:bottom-auto md:left-auto md:h-full md:w-96 transition-transform duration-300 ease-in-out z-30 ${!(isPanelOpen && selectedItemData) && 'pointer-events-none'} ${(isPanelOpen && selectedItemData) ? 'translate-y-0 translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}`}>
        {selectedItemData && (
          <PropertiesPanel
            selectedItem={selectedItemData}
            onUpdateNode={handleUpdateNode}
            onUpdateLink={handleUpdateLink}
            onDeleteLink={handleDeleteLink}
            onDeleteNode={handleDeleteNode}
            onClose={handleClosePanel}
            focusOnRender={focusOnRender}
            onFocusHandled={handleFocusHandled}
          />
        )}
      </div>
      <WelcomeModal isOpen={isWelcomeModalOpen} onClose={handleCloseWelcomeModal} />
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      <Footer />
    </div>
  );
};

export default App;