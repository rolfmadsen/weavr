import React, { useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';


// Features
import {
  validationService,
  STORAGE_KEY,
  type ModelMetadata,
  useImportExport,
  type Node,
  type Link,
  type Slice,
  ModelingProvider,
  useModelingStore
} from './features/modeling';
import { DocumentationGenerator } from './features/modeling/services/DocumentationGenerator';
import { useLayoutManager } from './features/modeling/store/useLayoutManagerHook';
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
import { usePlausible } from './features/analytics';
import { ThemeProvider } from './shared/providers/ThemeProvider';

function getModelIdFromUrl(): string {
  const hash = window.location.hash.slice(1);
  if (hash === 'model') {
    window.history.replaceState(null, '', ' ');
    return '';
  }
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

  // Plausible.io analytics
  const { signal } = usePlausible();
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
  const handleRequestAutoLayout = useCallback(() => {
    setLayoutRequestId(prev => prev + 1);
    signal("Layout.Requested", { method: 'MANUAL' });
  }, [signal]);

  const modelingStore = useModelingStore({
    modelId,
    viewState,
    signal,
    setSidebarView,
    setFocusOnRender,
    graphRef,
    setIsToolbarOpen,
    onRequestAutoLayout: handleRequestAutoLayout
  });

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
    handleAddLink,
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
    unpinAllNodes,
    unpinNode,
    modelName: syncedModelName,
    updateModelName: syncUpdateModelName,
    gunUpdateNodePositionsBatch,
    addToHistory,
    pasteNodes
  } = modelingStore;

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
    layoutRequestId,
    updateEdgeRoutes,
    gunUpdateNodePositionsBatch,
    gunUpdateNodePosition: modelingStore.gunUpdateNodePosition,
    addToHistory,
    signal
  });

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

  const handleGenerateDocs = async () => {
    if (!graphRef.current) return;
    const generator = new DocumentationGenerator(
      graphRef.current,
      slicesWithNodes,
      nodes,
      definitions,
      setHiddenSliceIds
    );

    // Initial message
    const msg = document.createElement('div');
    msg.id = 'doc-progress';
    msg.style.position = 'fixed';
    msg.style.bottom = '20px';
    msg.style.right = '20px';
    msg.style.background = '#333';
    msg.style.color = '#fff';
    msg.style.padding = '12px 24px';
    msg.style.borderRadius = '4px';
    msg.style.zIndex = '9999';
    msg.innerText = 'Initializing Documentation Generator...';
    document.body.appendChild(msg);

    try {
      const html = await generator.generate({
        projectTitle: currentModelName || 'Event Model',
        description: `<a href="https://weavr.dk">Weavr.dk ${new Date().getFullYear()}`
      }, (_curr, _total, text) => {
        msg.innerText = text;
      });

      // Download
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(currentModelName || 'model').replace(/\s+/g, '_')}_docs.html`;
      a.click();
      URL.revokeObjectURL(url);
      msg.innerText = 'Documentation Generated!';
      signal("Documentation.Generated", { fileSize: html.length });
      setTimeout(() => document.body.removeChild(msg), 3000);
    } catch (e) {
      console.error(e);
      msg.innerText = 'Error Generating Documentation';
      msg.style.background = 'red';
      setTimeout(() => document.body.removeChild(msg), 3000);
    }
  };

  // Help Modal logic
  useEffect(() => {
    if (isReady && nodes.length === 0 && localStorage.getItem('weavr-intro-shown') !== 'true') {
      setIsHelpModalOpen(true);
    }
  }, [isReady, nodes, setIsHelpModalOpen]);

  // Derived Selection State
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

  // Auto-Zoom on Filter Change
  useEffect(() => {
    if (slices.length === 0) return;

    // Determine visible slices
    const visibleSlices = slices.filter(s => !hiddenSliceIds.includes(s.id));

    // Allow the canvas to update its nodes first
    setTimeout(() => {
      if (visibleSlices.length === 1) {
        graphRef.current?.panToSlice(visibleSlices[0].id);
      } else {
        // If filtering changed (even to "Show All"), fit the view to the new visible set
        graphRef.current?.panToCenter();
      }
    }, 100);
  }, [hiddenSliceIds, slices]);

  const handleSliceClick = useCallback((slice: Slice) => {
    setSidebarView('slices');
    setActiveSliceId(slice.id);
  }, [setSidebarView, setActiveSliceId]);


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
    onRedo: redo,
    onPaste: pasteNodes
  });

  // Sync GunDB name to Local Storage (Bi-directional)
  const prevSyncedName = React.useRef(syncedModelName);
  const prevCurrentName = React.useRef(currentModelName);

  // 1. GunDB -> Local Storage
  useEffect(() => {
    if (syncedModelName && syncedModelName !== prevSyncedName.current) {
      prevSyncedName.current = syncedModelName;
      if (syncedModelName !== 'Untitled Model' && syncedModelName !== currentModelName) {
        handleRenameModel(syncedModelName);
      }
    }
  }, [syncedModelName, currentModelName, handleRenameModel]);

  // 2. Local Storage -> GunDB
  useEffect(() => {
    if (currentModelName && currentModelName !== prevCurrentName.current) {
      prevCurrentName.current = currentModelName;
      if (currentModelName !== 'Untitled Model' && currentModelName !== syncedModelName) {
        syncUpdateModelName(currentModelName);
      }
    }
  }, [currentModelName, syncedModelName, syncUpdateModelName]);

  const handleAddSliceInternal = (title: string) => {
    const id = uuidv4();
    updateSlice(id, { title, order: slices.length });
    return id;
  };

  const handleRenameChapter = useCallback((oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    const slicesToUpdate = slices.filter(s => (s.chapter || 'General') === oldName);
    slicesToUpdate.forEach(s => updateSlice(s.id, { chapter: newName.trim() }));
  }, [slices, updateSlice]);

  return (
    <ModelingProvider store={modelingStore}>
      <ThemeProvider>
        {/* Glassmorphism Background Layer */}
        <div className="fixed inset-0 -z-10 bg-slate-50 dark:bg-slate-950 transition-colors duration-700">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-96 h-96 bg-cyan-300 dark:bg-cyan-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-20 w-96 h-96 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="w-screen h-[100dvh] overflow-hidden overscroll-none relative font-sans flex flex-col text-slate-800 dark:text-slate-100">
          <Header
            onOpen={handleOpenProject}
            onMerge={handleMergeImport}
            onExport={handleExport}
            onOpenHelp={() => { setIsHelpModalOpen(true); signal("Help.Opened"); }}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onAutoLayout={handleAutoLayout}
            onUnpinAll={unpinAllNodes}
            onOpenModelList={() => { setIsModelListOpen(true); signal("ModelList.Opened"); }}
            currentModelName={currentModelName}
            onRenameModel={(name) => { syncUpdateModelName(name); signal("Model.Renamed"); }} // connect to GunDB write
            onGenerateDocs={handleGenerateDocs}
            onShare={() => signal("Share.Clicked")}
            hasPinnedNodes={nodes.some(n => n.fx !== undefined || n.fy !== undefined)}
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
            onRenameChapter={handleRenameChapter}
            initialViewState={viewState}
            ref={graphRef}
          />

          <div className="absolute bottom-16 left-8 z-10 flex flex-col items-start pointer-events-none [&>*]:pointer-events-auto">
            <ElementFilter nodes={nodes} onNodeClick={(n: Node) => {
              handleFocusNode(n.id);
              signal("Filter.ElementSelected", { type: n.type });
            }} />
            <SliceFilter slices={slices} hiddenSliceIds={hiddenSliceIds} onChange={(ids) => {
              setHiddenSliceIds(ids);
              signal("Filter.SlicesChanged", { hiddenCount: ids.length });
            }} />
            <Minimap nodes={nodes} slices={slices} stageScale={viewState.scale} stagePos={viewState} onNavigate={(x: number, y: number) => {
              graphRef.current?.handleNavigate?.(x, y);
              signal("Minimap.Navigated");
            }} viewportWidth={viewState.width || windowSize.width} viewportHeight={viewState.height || windowSize.height} />
          </div>

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
                focusOnRender={focusOnRender}
                onFocusHandled={() => setFocusOnRender(false)}
                modelId={modelId}
              />
            )}
            {sidebarView === 'slices' && (
              <SliceList
                slices={slicesWithNodes}
                onAddSlice={handleAddSliceInternal}
                onUpdateSlice={updateSlice}
                onDeleteSlice={deleteSlice}
                onManageSlice={(id: string) => { setSliceManagerInitialId(id); setIsSliceManagerOpen(true); }}
                modelId={modelId}
                expandedId={activeSliceId}
                onAutoLayout={handleRequestAutoLayout}
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
    </ModelingProvider>
  );
};

export default App;