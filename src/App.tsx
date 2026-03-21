import React, { useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { bus } from './shared/events/eventBus';
import Konva from 'konva';


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
import { useLayoutManager } from './features/modeling/store/useLayoutManager';
import { GraphCanvas, type GraphCanvasKonvaRef } from './features/canvas';
import { Minimap } from './features/canvas';
import { ZoomControls } from './features/canvas/ui/ZoomControls';
import {
  PropertiesPanel,
  SliceFilter,
  ElementFilter,
  SliceManagerModal,
} from './features/editor';
import { SliceList } from './features/slices';
import { DataDictionaryList } from './features/dictionary';
import { ActorsList } from './features/actors';


import {
  Header,
  Footer,
  Sidebar,
  Toolbar,
  HelpModal,
  ModelListModal,
  HelpButton,
  useKeyboardShortcuts,
  useWorkspaceManager
} from './features/workspace';
import { usePlausible } from './features/analytics';
import { ThemeProvider } from './shared/providers/ThemeProvider';
import { GlassTooltip } from './shared/components/GlassTooltip';

function getModelIdFromUrl(): string {
  const hash = window.location.hash.slice(1);
  if (hash === 'model') {
    window.history.replaceState(null, '', ' ');
    return 'demo';
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
  const { t } = useTranslation();
  // Preline initialization
  useEffect(() => {
    const initPreline = async () => {
      await import('preline');
      if (window.HSStaticMethods && typeof window.HSStaticMethods.autoInit === 'function') {
        window.HSStaticMethods.autoInit();
      }
    };
    initPreline();
  }, [window.location.hash]); // We use hash-based routing/state

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
    focusModeEnabled, setFocusModeEnabled,
    focusModeSteps, setFocusModeSteps,
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
    focusOnRender,
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
    orphanedFields,
    isReady,
    edgeRoutesMap: autoLayoutEdges,
    manualPositionsRef,
    selectedNodeIdsArray,
    selectedLinkId,
    handleAddNode,
    handleAddLink,
    handleDeleteSelection,
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
    handleLinkFieldToDefinition,
    updateSlice,
    deleteSlice,
    updateEdgeRoutes,
    unpinAllNodes,
    modelName: syncedModelName,
    updateModelName: syncUpdateModelName,

    pasteNodes,
    updateSliceBounds,
    sliceBoundsMap,
    actors,
    addActor,
    updateActor,
    deleteActor
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

  // 4. Layout Logic — Focus Mode BFS
  const effectiveHiddenSliceIds = useMemo(() => {
    if (!focusModeEnabled || selectedNodeIdsArray.length === 0) return hiddenSliceIds;

    // 1. Find slices for selected nodes
    const selectedSliceIds = new Set<string>();
    selectedNodeIdsArray.forEach(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      if (node?.sliceId) selectedSliceIds.add(node.sliceId);
    });
    if (selectedSliceIds.size === 0) return hiddenSliceIds;

    // 2. Build slice adjacency graph via links
    const sliceAdjacency = new Map<string, Set<string>>();
    links.forEach(link => {
      const sourceNode = nodes.find(n => n.id === link.source);
      const targetNode = nodes.find(n => n.id === link.target);
      if (!sourceNode?.sliceId || !targetNode?.sliceId) return;
      if (sourceNode.sliceId === targetNode.sliceId) return;
      if (!sliceAdjacency.has(sourceNode.sliceId)) sliceAdjacency.set(sourceNode.sliceId, new Set());
      if (!sliceAdjacency.has(targetNode.sliceId)) sliceAdjacency.set(targetNode.sliceId, new Set());
      sliceAdjacency.get(sourceNode.sliceId)!.add(targetNode.sliceId);
      sliceAdjacency.get(targetNode.sliceId)!.add(sourceNode.sliceId);
    });

    // 3. BFS with X steps
    const visibleSliceIds = new Set(selectedSliceIds);
    let frontier = [...selectedSliceIds];
    for (let step = 0; step < focusModeSteps; step++) {
      const nextFrontier: string[] = [];
      frontier.forEach(sliceId => {
        sliceAdjacency.get(sliceId)?.forEach(neighbor => {
          if (!visibleSliceIds.has(neighbor)) {
            visibleSliceIds.add(neighbor);
            nextFrontier.push(neighbor);
          }
        });
      });
      frontier = nextFrontier;
    }

    // 4. Hide all slices NOT in BFS result
    return slices.filter(s => !visibleSliceIds.has(s.id)).map(s => s.id);
  }, [focusModeEnabled, selectedNodeIdsArray, nodes, links, slices, focusModeSteps, hiddenSliceIds]);

    // 5. Filter Logic
    // Source for navigation: Only based on manual check marks
    const manualVisibleNodes = useMemo(() => {
      return nodes.filter(node => !node.sliceId || !hiddenSliceIds.includes(node.sliceId));
    }, [nodes, hiddenSliceIds]);

    // Source for rendering: Focus Mode aware
    const filteredNodes = useMemo(() => {
      if (!focusModeEnabled || selectedNodeIdsArray.length === 0) {
        // Normal Mode: Manual filters + all orphans
        return manualVisibleNodes;
      }

      // Focus Mode: BFS visible slices + related orphans
      const visibleNodeIdsSet = new Set<string>();
      
      // 1. Gather nodes from visible slices
      manualVisibleNodes.forEach(node => {
        if (node.sliceId && !effectiveHiddenSliceIds.includes(node.sliceId)) {
          visibleNodeIdsSet.add(node.id);
        }
      });

      // 2. Add currently selected nodes (always visible)
      selectedNodeIdsArray.forEach(id => visibleNodeIdsSet.add(id));

      // 3. Add Orphans (no sliceId) only if they are linked to a node in visibleNodeIdsSet
      // This satisfies the "User Request: If an element without a slice is related ... it should also be visible"
      const orphans = nodes.filter(n => !n.sliceId);
      orphans.forEach(node => {
        if (visibleNodeIdsSet.has(node.id)) return;
        
        const isRelated = links.some(link => 
          (link.source === node.id && visibleNodeIdsSet.has(link.target)) ||
          (link.target === node.id && visibleNodeIdsSet.has(link.source))
        );

        if (isRelated) {
          visibleNodeIdsSet.add(node.id);
        }
      });

      return nodes.filter(n => visibleNodeIdsSet.has(n.id));
    }, [manualVisibleNodes, nodes, links, focusModeEnabled, selectedNodeIdsArray, effectiveHiddenSliceIds]);

    const filteredLinks = useMemo(() => {
    if (effectiveHiddenSliceIds.length === 0) return links;
    const nodeIds = new Set(filteredNodes.map((n: Node) => n.id));
    return links.filter((link: Link) => nodeIds.has(link.source) && nodeIds.has(link.target));
  }, [links, filteredNodes, effectiveHiddenSliceIds]);

  const filteredSlices = useMemo(() => {
    if (effectiveHiddenSliceIds.length === 0) return slicesWithNodes;
    return slicesWithNodes.filter(s => !effectiveHiddenSliceIds.includes(s.id));
  }, [slicesWithNodes, effectiveHiddenSliceIds]);

  const { handleAutoLayout } = useLayoutManager({
    nodes: filteredNodes,
    links: filteredLinks,
    slicesWithNodes: filteredSlices,
    layoutRequestId,
    updateEdgeRoutes,
    updateSliceBounds,

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
    sliceBoundsMap,
    signal,
    clearSelection: () => { },
    handleClosePanel,
    manualPositionsRef,
    updateEdgeRoutes,
    updateSliceBounds,
    onImportComplete: () => setPendingFitView(true),
    onRequestAutoLayout: handleRequestAutoLayout
  });

  const handleGenerateDocs = async () => {
    if (!graphRef.current) return;
    const generator = new DocumentationGenerator(
      graphRef.current,
      filteredSlices,
      filteredNodes,
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
      }, t, (_curr, _total, text) => {
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

  const handleCloseSidebar = () => {
    setSidebarView(null);
    // Ensure focus returns to the canvas
    setTimeout(() => {
      graphRef.current?.focus();
    }, 50);
  };

  // Auto-Zoom on Filter Change (works for both manual filtering and Focus Mode)
  useEffect(() => {
    if (slices.length === 0) return;

    // Determine visible slices using the effective (Focus Mode-aware) hidden IDs
    const visibleSlices = slices.filter(s => !effectiveHiddenSliceIds.includes(s.id));

    // Allow the canvas to update its nodes first
    setTimeout(() => {
      if (visibleSlices.length === 1) {
        graphRef.current?.panToSlice(visibleSlices[0].id);
      } else if (visibleSlices.length > 0 && visibleSlices.length < slices.length) {
        graphRef.current?.panToCenter();
      } else {
        graphRef.current?.panToCenter();
      }
    }, 100);
  }, [effectiveHiddenSliceIds, slices]);

  const handleUnpinNode = useCallback((id: string) => {
    bus.emit('command:unpinNode', { id });
  }, [bus]);

  const handleJumpToRelationship = useCallback((node?: Node) => {
    if (node) {
      handleNodeClick(node.id);
    }
    setSidebarView('properties');
    
    // Focus the first relationship select in the sidebar
    // Increased delay to ensure sidebar transition and NodeProperties rendering
    setTimeout(() => {
      const relInput = document.querySelector('.relationship-smart-select') as HTMLInputElement;
      if (relInput) {
        relInput.focus();
      }
    }, 250);
  }, [handleNodeClick, setSidebarView]);

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
    onOpenActors: () => setSidebarView('actors'),
    onSelectNode: (node: Node) => handleNodeClick(node.id),
    onAddNode: handleAddNode,
    onMoveNodes: (updates) => {
      const arrayUpdates = Array.from(updates.entries()).map(([nodeId, pos]) => ({
        id: nodeId,
        x: pos.fx,
        y: pos.fy
      }));
      bus.emit('command:moveNodes', { updates: arrayUpdates, pinned: true });
    },
    onFocusNode: (id: string | undefined) => id && handleFocusNode(id),
    onAutoLayout: handleAutoLayout,
    onPaste: pasteNodes,
    onSelectAll: () => handleMarqueeSelect(nodes.map(n => n.id)),
    onDuplicate: () => pasteNodes(nodes.filter(n => selectedNodeIdsArray.includes(n.id))),
    onZoomIn: () => graphRef.current?.zoomIn(),
    onZoomOut: () => graphRef.current?.zoomOut(),
    onResetZoom: () => graphRef.current?.resetZoom()
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
            onAutoLayout={handleAutoLayout}
            onUnpinAll={unpinAllNodes}
            onOpenModelList={() => { setIsModelListOpen(true); signal("ModelList.Opened"); }}
            currentModelName={currentModelName}
            onRenameModel={(name) => { syncUpdateModelName(name); signal("Model.Renamed"); }} // connect to GunDB write
            onGenerateDocs={handleGenerateDocs}
            onShare={() => signal("Share.Clicked")}
            hasPinnedNodes={nodes.some(n => !!n.pinned)}
          />

          <GraphCanvas
            nodes={filteredNodes}
            links={filteredLinks}
            slices={filteredSlices}
            allSlices={slices}
            navigationNodes={manualVisibleNodes}
            actors={actors}
            definitions={definitions}
            selectedIds={selectedIds}
            edgeRoutes={autoLayoutEdges}
            autoLayoutSliceBounds={sliceBoundsMap}
            onNodeClick={(node: Node, event?: Konva.KonvaEventObject<MouseEvent>) => {
              const isMulti = event?.evt?.shiftKey;
              handleNodeClick(node.id, !!isMulti);
            }}
            onLinkClick={(link: Link) => handleLinkClick(link.id)}
            onNodeDoubleClick={(node: Node) => handleNodeDoubleClick(node.id)}
            onLinkDoubleClick={(link: Link) => handleLinkDoubleClick(link.id)}
            onAddLink={handleAddLink}
            onCanvasClick={() => {
              handleClosePanel();
              setIsToolbarOpen(false);
            }}
            onMarqueeSelect={(ids: string[]) => {
              handleMarqueeSelect(ids);
              if (ids.length > 0) {
                setSidebarView('properties');
                setFocusOnRender(true);
              }
            }}
            onValidateConnection={(s: Node, t: Node) => validationService.isValidConnection(s, t)}
            onViewChange={setViewState}
            onSliceClick={handleSliceClick}
            onRenameChapter={handleRenameChapter}
            onUnpin={handleUnpinNode}
            onRelationalAuraClick={handleJumpToRelationship}
            isSidebarOpen={!!sidebarView}
            initialViewState={viewState}
            ref={graphRef}
          />

          <div className="absolute bottom-16 left-8 z-10 flex flex-col items-start pointer-events-none [&>*]:pointer-events-auto">
            <ElementFilter nodes={nodes} onNodeClick={(n: Node) => {
              handleFocusNode(n.id);
            }} />
            <SliceFilter
              slices={slices}
              hiddenSliceIds={hiddenSliceIds}
              onChange={(ids) => setHiddenSliceIds(ids)}
              focusModeEnabled={focusModeEnabled}
              onFocusModeChange={setFocusModeEnabled}
              focusModeSteps={focusModeSteps}
              onFocusModeStepsChange={setFocusModeSteps}
              effectiveHiddenSliceIds={effectiveHiddenSliceIds}
            />
            <Minimap nodes={nodes} slices={slices} stageScale={viewState.scale} stagePos={viewState} onNavigate={(x: number, y: number) => {
              graphRef.current?.handleNavigate?.(x, y);
            }} viewportWidth={viewState.width || windowSize.width} viewportHeight={viewState.height || windowSize.height} />
            <ZoomControls
              scale={viewState.scale}
              onZoomIn={() => graphRef.current?.zoomIn()}
              onZoomOut={() => graphRef.current?.zoomOut()}
              onResetZoom={() => graphRef.current?.resetZoom()}
            />
          </div>

          <div className="absolute bottom-8 right-24 md:bottom-12 md:right-32 z-20 pointer-events-none flex items-center justify-center">
             <GlassTooltip content={t('workspace.header.help')}>
                <HelpButton onClick={() => { setIsHelpModalOpen(true); signal("Help.Opened"); }} />
             </GlassTooltip>
          </div>

          <Toolbar onAddNode={handleAddNode} disabled={!isReady} isMenuOpen={isToolbarOpen} onToggleMenu={() => setIsToolbarOpen((prev: boolean) => !prev)} />

          <Sidebar
            isOpen={!!sidebarView}
            onClose={handleCloseSidebar}
            title={sidebarView === 'properties' ? t('workspace.sidebar.properties') : sidebarView === 'slices' ? t('workspace.sidebar.slices') : sidebarView === 'actors' ? t('workspace.sidebar.actors') : t('workspace.sidebar.dictionary')}
            activeTab={sidebarView || 'properties'}
            onTabChange={(tab: string) => { setSidebarView(tab as any); }}
            tabs={[
                { id: 'properties', label: t('workspace.sidebar.properties'), title: 'Alt + P' }, 
                { id: 'dictionary', label: t('workspace.sidebar.dictionary'), title: 'Alt + D' }, 
                { id: 'slices', label: t('workspace.sidebar.slices'), title: 'Alt + S' }, 
                { id: 'actors', label: t('workspace.sidebar.actors'), title: 'Start' }
            ]}
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
                onAddDefinition={(def) => addDefinition(def) || ''}
                onUpdateDefinition={updateDefinition}
                onRemoveDefinition={deleteDefinition}
                modelId={modelId}
                orphanedFields={orphanedFields}
                onLinkFieldToDefinition={handleLinkFieldToDefinition}
              />
            )}
            {sidebarView === 'actors' && (
              <ActorsList
                actors={actors || []}
                onAddActor={addActor}
                onUpdateActor={updateActor}
                onRemoveActor={deleteActor}
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