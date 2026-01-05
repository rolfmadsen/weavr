import React, { useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme';

// Features
import {
  validationService,
  STORAGE_KEY,
  type ModelMetadata,
  useModelManager,
  useLayoutManager,
  useImportExport,
  type Node,
  type Link,
  type Slice
} from './features/modeling';
import { GraphCanvas, type GraphCanvasKonvaRef } from './features/canvas';
import { Minimap } from './features/canvas';
import {
  PropertiesPanel,
  SliceFilter,
  ElementFilter,
  SliceList,
  DataDictionaryList,
  SliceManagerModal
} from './features/editor';
import { AppTelemetry, useTelemetry } from './features/telemetry/AppTelemetry';
import {
  Header,
  Footer,
  Sidebar,
  Toolbar,
  HelpModal,
  ModelListModal,
  useKeyboardShortcuts,
  useWorkspaceManager
} from './features/workspace';

function getModelIdFromUrl(): string {
  const hash = window.location.hash.slice(1);
  if (hash) return hash;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const models: ModelMetadata[] = JSON.parse(stored);
      models.sort((a, b) => b.updatedAt - a.updatedAt);
      if (models.length > 0) {
        const lastModel = models[0];
        window.location.hash = lastModel.id;
        return lastModel.id;
      }
    }
  } catch (e) { }
  const newId = uuidv4();
  window.location.hash = newId;
  return newId;
}

const App: React.FC = () => {
  const [modelId, setModelId] = React.useState<string | null>(null);
  const [pendingFitView, setPendingFitView] = React.useState(false);

  // 1. Initial Load
  useEffect(() => {
    const id = getModelIdFromUrl();
    setModelId(id);
    const handleHashChange = () => window.location.reload();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const { signal } = useTelemetry();
  const graphRef = React.useRef<GraphCanvasKonvaRef>(null);
  const [windowSize, setWindowSize] = React.useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Workspace State
  const {
    focusOnRender, setFocusOnRender,
    isToolbarOpen, setIsToolbarOpen,
    isHelpModalOpen, setIsHelpModalOpen,
    isModelListOpen, setIsModelListOpen,
    hiddenSliceIds, setHiddenSliceIds,
    activeSliceId, setActiveSliceId,
    isSliceManagerOpen, setIsSliceManagerOpen,
    sliceManagerInitialId, setSliceManagerInitialId,
    sidebarView, setSidebarView,
    viewState, setViewState,
    currentModelName,
    handleRenameModel
  } = useWorkspaceManager({ modelId });

  // 3. Model Logic
  const [layoutRequestId, setLayoutRequestId] = React.useState(0);
  const handleRequestAutoLayout = useCallback(() => setLayoutRequestId(prev => prev + 1), []);

  const {
    nodes,
    links,
    slices,
    slicesWithNodes,
    definitions,
    isReady,
    edgeRoutesMap: autoLayoutEdges,
    manualPositionsRef,
    selectedNodeIdsArray,
    selectedLinkId,
    handleAddNode,
    handleDeleteNode,
    handleUpdateNode,
    handleUpdateLink,
    handleAddLink,
    handleDeleteLink,
    handleDeleteSelection,
    handleNodesDrag,
    handleNodeClick,
    handleLinkClick,
    handleNodeDoubleClick,
    handleLinkDoubleClick,
    handleMarqueeSelect,
    handleFocusNode,
    handleClosePanel,
    addDefinition,
    updateDefinition,
    deleteDefinition,
    updateSlice,
    deleteSlice,
    updateEdgeRoutes,
    undo,
    redo,
    canUndo,
    canRedo,
    gunUpdateNodePosition,
    gunUpdateNodePositionsBatch, // Add this
    unpinAllNodes,
    unpinNode,
    addToHistory,
    modelName: syncedModelName,
    updateModelName: syncUpdateModelName
  } = useModelManager({
    modelId,
    viewState,
    signal,
    setSidebarView,
    setFocusOnRender,
    graphRef,
    setIsToolbarOpen,
    onRequestAutoLayout: handleRequestAutoLayout
  });

  // Fit View Effect whenever pendingFitView is true and nodes are present
  useEffect(() => {
    if (pendingFitView && nodes.length > 0) {
      // Debounce slightly to ensure all nodes from the import batch are loaded
      const timer = setTimeout(() => {
        graphRef.current?.panToCenter();
        setPendingFitView(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingFitView, nodes.length]);

  // 4. Layout Logic
  const { handleAutoLayout } = useLayoutManager({
    nodes,
    links,
    slicesWithNodes,
    gunUpdateNodePosition,
    gunUpdateNodePositionsBatch, // Pass batch function
    updateEdgeRoutes,
    addToHistory,
    signal,
    layoutRequestId
  });

  // 5. Serialization
  // 5. Serialization
  const { handleExport, handleOpenProject, handleMergeImport } = useImportExport({
    modelId,
    nodes,
    links,
    slices,
    definitions,
    edgeRoutesMap: autoLayoutEdges,
    signal,
    clearSelection: () => { },
    handleClosePanel,
    manualPositionsRef,
    updateEdgeRoutes,
    onImportComplete: () => setPendingFitView(true)
  });

  // Help Modal logic
  useEffect(() => {
    if (isReady && nodes.length === 0 && localStorage.getItem('weavr-intro-shown') !== 'true') {
      setIsHelpModalOpen(true);
    }
  }, [isReady, nodes, setIsHelpModalOpen]);

  // Derived Selection State
  const selectedItemData = useMemo(() => {
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
  }, [selectedNodeIdsArray, selectedLinkId, nodes, links]);

  const selectedIds = useMemo(() => {
    return selectedLinkId ? [...selectedNodeIdsArray, selectedLinkId] : selectedNodeIdsArray;
  }, [selectedNodeIdsArray, selectedLinkId]);

  // Filters
  const filteredNodes = useMemo(() => {
    if (hiddenSliceIds.length === 0) return nodes;
    return nodes.filter((node: Node) => !node.sliceId || !hiddenSliceIds.includes(node.sliceId));
  }, [nodes, hiddenSliceIds]);

  const filteredLinks = useMemo(() => {
    if (hiddenSliceIds.length === 0) return links;
    const nodeIds = new Set(filteredNodes.map((n: Node) => n.id));
    return links.filter((link: Link) => nodeIds.has(link.source) && nodeIds.has(link.target));
  }, [links, filteredNodes, hiddenSliceIds]);

  const handleSliceClick = useCallback((slice: Slice) => {
    setSidebarView('slices');
    setActiveSliceId(slice.id);
  }, [setSidebarView, setActiveSliceId]);

  const handleBatchPin = useCallback(() => {
    selectedNodeIdsArray.forEach(id => handleUpdateNode(id, 'pinned', true));
  }, [selectedNodeIdsArray, handleUpdateNode]);

  const handleBatchUnpin = useCallback(() => {
    selectedNodeIdsArray.forEach(id => unpinNode(id));
    handleRequestAutoLayout();
  }, [selectedNodeIdsArray, unpinNode, handleRequestAutoLayout]);

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    nodes,
    selectedNodeIds: selectedNodeIdsArray,
    selectedLinkId,
    isPanelOpen: !!sidebarView,
    isToolbarOpen,
    isReady,
    showSlices: false,
    swimlanePositions: new Map(),
    onDeleteSelection: handleDeleteSelection,
    onClosePanel: handleClosePanel,
    onToggleToolbar: () => setIsToolbarOpen((prev: boolean) => !prev),
    onOpenPropertiesPanel: () => {
      setSidebarView('properties');
      setFocusOnRender(true);
    },
    onOpenSlices: () => setSidebarView('slices'),
    onOpenDictionary: () => setSidebarView('dictionary'),
    onSelectNode: (node: Node) => handleNodeClick(node.id),
    onAddNode: handleAddNode,
    onMoveNodes: (updates) => {
      const arrayUpdates = Array.from(updates.entries()).map(([nodeId, pos]) => ({
        nodeId,
        pos: { x: pos.fx, y: pos.fy }
      }));
      handleNodesDrag(arrayUpdates);
    },
    onFocusNode: (id: string | undefined) => id && handleFocusNode(id),
    onAutoLayout: handleAutoLayout,
    onUndo: undo,
    onRedo: redo
  });

  const handleAddSliceInternal = (title: string) => {
    const id = uuidv4();
    updateSlice(id, { title, order: slices.length });
    return id;
  };

  // Sync GunDB name to Local Storage
  useEffect(() => {
    if (syncedModelName && syncedModelName !== 'Untitled Model' && syncedModelName !== currentModelName) {
      handleRenameModel(syncedModelName);
    }
  }, [syncedModelName, currentModelName, handleRenameModel]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="w-screen h-[100dvh] overflow-hidden overscroll-none relative font-sans bg-gray-50 flex flex-col">
        <Header
          onOpen={handleOpenProject}
          onMerge={handleMergeImport}
          onExport={handleExport}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onAutoLayout={handleAutoLayout}
          onUnpinAll={unpinAllNodes}
          onOpenModelList={() => setIsModelListOpen(true)}
          currentModelName={currentModelName}
          onRenameModel={syncUpdateModelName} // connect to GunDB write
        />

        <GraphCanvas
          nodes={filteredNodes}
          links={filteredLinks}
          slices={slicesWithNodes}
          selectedIds={selectedIds}
          edgeRoutes={autoLayoutEdges}
          onNodeClick={(node: Node, event?: any) => {
            const isMulti = event?.shiftKey || event?.evt?.shiftKey;
            handleNodeClick(node.id, !!isMulti);
          }}
          onLinkClick={(link: Link) => handleLinkClick(link.id)}
          onNodeDoubleClick={(node: Node) => handleNodeDoubleClick(node.id)}
          onLinkDoubleClick={(link: Link) => handleLinkDoubleClick(link.id)}
          onNodesDrag={handleNodesDrag}
          onUnpinNode={unpinNode}
          onAddLink={handleAddLink}
          onCanvasClick={() => {
            handleClosePanel();
            setIsToolbarOpen(false);
          }}
          onMarqueeSelect={(ids: string[]) => {
            handleMarqueeSelect(ids);
            if (ids.length > 0) setSidebarView('properties');
          }}
          onValidateConnection={(s: Node, t: Node) => validationService.isValidConnection(s, t)}
          onViewChange={setViewState}
          onSliceClick={handleSliceClick}
          initialViewState={viewState}
          ref={graphRef}
        />

        <Box sx={{ position: 'absolute', bottom: 64, left: 32, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', pointerEvents: 'none', '& > *': { pointerEvents: 'auto' } }}>
          <ElementFilter nodes={nodes} onNodeClick={(n: Node) => handleFocusNode(n.id)} />
          <SliceFilter slices={slices} hiddenSliceIds={hiddenSliceIds} onChange={setHiddenSliceIds} />
          <Minimap nodes={nodes} slices={slices} stageScale={viewState.scale} stagePos={viewState} onNavigate={(x: number, y: number) => graphRef.current?.handleNavigate?.(x, y)} viewportWidth={viewState.width || windowSize.width} viewportHeight={viewState.height || windowSize.height} />
        </Box>

        <Toolbar onAddNode={handleAddNode} disabled={!isReady} isMenuOpen={isToolbarOpen} onToggleMenu={() => setIsToolbarOpen((prev: boolean) => !prev)} />

        <Sidebar
          isOpen={!!sidebarView}
          onClose={() => { setSidebarView(null); }}
          title={sidebarView === 'properties' ? 'Properties' : sidebarView === 'slices' ? 'Slices' : 'Data Dictionary'}
          activeTab={sidebarView || 'properties'}
          onTabChange={(tab: any) => { setSidebarView(tab as any); if (tab) signal("Sidebar.TabChanged", { tab }); }}
          tabs={[{ id: 'properties', label: 'Properties', title: 'Alt + P' }, { id: 'dictionary', label: 'Data', title: 'Alt + D' }, { id: 'slices', label: 'Slices', title: 'Alt + S' }]}
        >
          {sidebarView === 'properties' && (
            <PropertiesPanel
              selectedItem={selectedItemData}
              onUpdateNode={handleUpdateNode}
              onUpdateLink={handleUpdateLink}
              onDeleteLink={handleDeleteLink}
              onDeleteNode={handleDeleteNode}
              slices={slicesWithNodes}
              onAddSlice={handleAddSliceInternal}
              focusOnRender={focusOnRender}
              onFocusHandled={() => setFocusOnRender(false)}
              definitions={definitions}
              onAddDefinition={(def: any) => addDefinition(def) || ''}
              modelId={modelId}
              onPinSelection={handleBatchPin}
              onUnpinSelection={handleBatchUnpin}
            />
          )}
          {sidebarView === 'slices' && (
            <SliceList
              slices={slicesWithNodes}
              definitions={definitions}
              onAddSlice={handleAddSliceInternal}
              onUpdateSlice={updateSlice}
              onDeleteSlice={deleteSlice}
              onManageSlice={(id: string) => { setSliceManagerInitialId(id); setIsSliceManagerOpen(true); }}
              modelId={modelId}
              expandedId={activeSliceId}
            />
          )}
          {sidebarView === 'dictionary' && (
            <DataDictionaryList
              definitions={definitions}
              onAddDefinition={(def: any) => addDefinition(def) || ''}
              onUpdateDefinition={updateDefinition}
              onRemoveDefinition={deleteDefinition}
              modelId={modelId}
            />
          )}
        </Sidebar>

        <AppTelemetry nodeCount={nodes.length} linkCount={links.length} isReady={isReady} />
        <HelpModal
          isOpen={isHelpModalOpen}
          onClose={() => { setIsHelpModalOpen(false); localStorage.setItem('weavr-intro-shown', 'true'); }}
          onImport={handleOpenProject}
        />
        <ModelListModal isOpen={isModelListOpen} onClose={() => setIsModelListOpen(false)} currentModelId={modelId} />
        <SliceManagerModal
          isOpen={isSliceManagerOpen}
          onClose={() => { setIsSliceManagerOpen(false); setSliceManagerInitialId(null); }}
          slices={slicesWithNodes}
          onAddSlice={handleAddSliceInternal}
          onUpdateSlice={updateSlice}
          onDeleteSlice={deleteSlice}
          initialViewingSpecsId={sliceManagerInitialId}
        />
        <Footer />
      </div>
    </ThemeProvider>
  );
};

export default App;