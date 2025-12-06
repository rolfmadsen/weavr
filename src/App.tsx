import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

// Features
import {
  Node,
  Link,
  ElementType,
  DataDefinition,
  ModelData,
  calculateNodeHeight,
  validationService,
  useModelList,
  calculateElkLayout
} from './features/modeling';
import { GraphCanvas, useSelection } from './features/canvas';
import { gunClient, useGraphSync, useHistory } from './features/collaboration';
import {
  PropertiesPanel,
  SliceFilter,
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
  WelcomeModal,
  ModelListModal,
  useKeyboardShortcuts
} from './features/workspace';

// TODO: Restore export functionality
// import { exportWeavrProject, importWeavrProject } from './utils/exportUtils';

function getModelIdFromUrl(): string {
  const hash = window.location.hash.slice(1);
  if (hash) return hash;
  const newId = uuidv4();
  window.location.hash = newId;
  return newId;
}

const App: React.FC = () => {
  const [modelId, setModelId] = useState<string | null>(null);

  const [focusOnRender, setFocusOnRender] = useState(false);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isModelListOpen, setIsModelListOpen] = useState(false);
  const [filteredSliceIds, setFilteredSliceIds] = useState<string[]>([]);

  const [isSliceManagerOpen, setIsSliceManagerOpen] = useState(false);
  const [sliceManagerInitialId, setSliceManagerInitialId] = useState<string | null>(null);

  // --- Sidebar Management ---
  const [sidebarView, setSidebarView] = useState<'properties' | 'slices' | 'dictionary' | null>(null);

  // Track view state (pan/zoom) for smart node placement
  const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
  const graphRef = React.useRef<any>(null);
  const [isLayoutLoading, setIsLayoutLoading] = useState(false);

  // Store explicit edge paths from ELK
  const [autoLayoutEdges, setAutoLayoutEdges] = useState<Map<string, number[]>>(new Map());

  // 1. Gun State Management

  const {
    nodes,
    links,
    slices, // Restored slices
    addSlice, // Needed for PropertiesPanel
    isReady,
    manualPositionsRef,
    addNode: gunAddNode,
    updateNode: gunUpdateNode,
    deleteNode: gunDeleteNode,
    addLink: gunAddLink,
    updateLink: gunUpdateLink,
    deleteLink: gunDeleteLink,
    updateNodePosition: gunUpdateNodePosition,
    updateSlice,
    deleteSlice,
    definitions,
    addDefinition,
    updateDefinition,
    deleteDefinition
  } = useGraphSync(modelId);

  const { models, updateModel, addModel } = useModelList();

  const currentModelName = useMemo(() => {
    return models.find(m => m.id === modelId)?.name || 'Untitled Model';
  }, [models, modelId]);

  // Register model in local index if not present
  useEffect(() => {
    if (modelId) {
      addModel(modelId, 'Untitled Model');
    }
  }, [modelId, addModel]);

  const handleRenameModel = useCallback((newName: string) => {
    if (modelId) {
      updateModel(modelId, { name: newName });
    }
  }, [modelId, updateModel]);

  const definitionsArray = useMemo(() => {
    return definitions;
  }, [definitions]);

  const handleAddDefinition = (def: Omit<DataDefinition, 'id'>) => {
    const newDefId = addDefinition(def);
    return newDefId || '';
  };
  const handleUpdateDefinition = (id: string, updates: any) => {
    updateDefinition(id, updates);
  };

  const handleDeleteDefinition = (id: string) => {
    deleteDefinition(id);
  };


  // 2. Selection Management
  const {
    selectedNodeIds, // This is a Set<string> in useSelection, but we need to handle it carefully
    selectedLinkId,
    selectNode,
    selectLink,
    clearSelection,
    setSelection
  } = useSelection();

  // Convert Set to Array for easier usage in App.tsx
  const selectedNodeIdsArray = useMemo(() => Array.from(selectedNodeIds), [selectedNodeIds]);

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

  const lastFocusedElementRef = React.useRef<HTMLElement | null>(null);

  const handleClosePanel = useCallback(() => {
    // Restore focus
    if (lastFocusedElementRef.current && document.body.contains(lastFocusedElementRef.current)) {
      lastFocusedElementRef.current.focus();
    } else {
      // Fallback: blur active element if we can't restore
      if (document.activeElement) {
        (document.activeElement as HTMLElement).blur();
      }
    }
    lastFocusedElementRef.current = null;

    setSidebarView(null);
  }, []);

  // Smart Add: Places node in the center of the current view
  const handleAddNode = useCallback((type: ElementType, explicitId?: string) => {
    // Calculate center of current view in world coordinates
    const centerX = (window.innerWidth / 2 - viewState.x) / viewState.scale;
    const centerY = (window.innerHeight / 2 - viewState.y) / viewState.scale;

    // Adjust for Top-Left anchor (subtract half width/height)
    let manualX = centerX - 80;
    let manualY = centerY - 30;

    // Snap to grid (20px)
    const GRID = 20;
    manualX = Math.round(manualX / GRID) * GRID;
    manualY = Math.round(manualY / GRID) * GRID;

    const id = gunAddNode(type, manualX, manualY, explicitId);
    if (id) {
      addToHistory({ type: 'ADD_NODE', payload: { id, type, x: manualX, y: manualY }, undoPayload: { id } });
      selectNode(id);
      selectNode(id);

      // Capture focus before opening
      if (document.activeElement instanceof HTMLElement) {
        lastFocusedElementRef.current = document.activeElement;
      }

      setSidebarView('properties');
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
      setSelection(selectedNodeIdsArray.filter(id => id !== nodeId));
    }
    handleClosePanel();
  }, [nodes, links, gunDeleteNode, addToHistory, selectedNodeIds, selectedNodeIdsArray, setSelection, handleClosePanel]);

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
    // Clear auto-layout edges on drag to switch to dynamic routing
    setAutoLayoutEdges(new Map());

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
  }, [nodes, gunUpdateNodePosition, addToHistory, autoLayoutEdges]);


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

    // Capture focus (if not already open/captured)
    if (!sidebarView && document.activeElement instanceof HTMLElement) {
      lastFocusedElementRef.current = document.activeElement;
    }

    setIsToolbarOpen(false);
  }, [selectedNodeIds, selectNode, sidebarView]);

  const handleFocusNode = useCallback(() => {
    if (selectedNodeIds.length === 1 && graphRef.current) {
      graphRef.current.panToNode(selectedNodeIdsArray[0]);
    }
  }, [selectedNodeIds, selectedNodeIdsArray]);

  // --- Auto Layout Handler (ELK) ---
  const handleAutoLayout = useCallback(async () => {
    if (nodes.length === 0) return;
    setIsLayoutLoading(true);

    try {
      // 1. Snapshot the CURRENT (Old) positions before we change them
      const oldPositions = nodes.map(n => ({
        id: n.id,
        x: n.fx ?? n.x, // Use fixed position if available, else current x
        y: n.fy ?? n.y
      }));

      // const { calculateElkLayout } = await import('./services/elkLayoutService');

      // 2. Get new positions (returns object with positions and routes)
      const { positions: newPositionsMap, edgeRoutes } = await calculateElkLayout(nodes, links, slices);

      console.log(`Auto - layout calculated for ${newPositionsMap.size} nodes.`);

      // Update edge routes for rendering
      setAutoLayoutEdges(edgeRoutes);

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
  }, [nodes, links, gunUpdateNodePosition, addToHistory]);



  // --- Keyboard Shortcuts ---
  useKeyboardShortcuts({
    nodes,
    selectedNodeIds,
    selectedLinkId,
    isPanelOpen: !!sidebarView,
    isToolbarOpen,
    isReady,
    showSlices: false, // Force false
    swimlanePositions: new Map(), // Empty
    onDeleteSelection: handleDeleteSelection,
    onClosePanel: handleClosePanel,
    onToggleToolbar: () => setIsToolbarOpen(prev => !prev),
    onOpenPropertiesPanel: () => {
      if (!sidebarView && document.activeElement instanceof HTMLElement) {
        lastFocusedElementRef.current = document.activeElement;
      }
      setSidebarView('properties');
      setFocusOnRender(true);
    },
    onOpenSlices: () => {
      if (!sidebarView && document.activeElement instanceof HTMLElement) {
        lastFocusedElementRef.current = document.activeElement;
      }
      setSidebarView('slices');
    },
    onOpenDictionary: () => {
      if (!sidebarView && document.activeElement instanceof HTMLElement) {
        lastFocusedElementRef.current = document.activeElement;
      }
      setSidebarView('dictionary');
    },
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
    onFocusNode: handleFocusNode,
    onUndo: undo,
    onRedo: redo
  });


  const handleLinkClick = useCallback((link: Link) => {
    selectLink(link.id);

    // Capture focus
    if (!sidebarView && document.activeElement instanceof HTMLElement) {
      lastFocusedElementRef.current = document.activeElement;
    }

    setIsToolbarOpen(false);
  }, [selectLink, sidebarView]);

  const handleNodeDoubleClick = useCallback((node: Node) => {
    selectNode(node.id);

    if (document.activeElement instanceof HTMLElement) {
      lastFocusedElementRef.current = document.activeElement;
    }

    setSidebarView('properties');
    setFocusOnRender(true);
  }, [selectNode]);

  const handleLinkDoubleClick = useCallback((link: Link) => {
    selectLink(link.id);

    if (document.activeElement instanceof HTMLElement) {
      lastFocusedElementRef.current = document.activeElement;
    }

    setSidebarView('properties');
  }, [selectLink]);

  const handleMarqueeSelect = useCallback((nodeIds: string[]) => {
    setSelection(nodeIds);
    if (nodeIds.length > 0) {
      if (!sidebarView && document.activeElement instanceof HTMLElement) {
        lastFocusedElementRef.current = document.activeElement;
      }
      setSidebarView('properties');

    } else {

    }
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

      // Auto-assign slice if one node has it and the other doesn't
      if (sourceNode.sliceId && !targetNode.sliceId) {
        gunUpdateNode(targetId, { sliceId: sourceNode.sliceId });
        addToHistory({
          type: 'UPDATE_NODE',
          payload: { id: targetId, data: { sliceId: sourceNode.sliceId } },
          undoPayload: { sliceId: undefined } // Assuming it was undefined
        });
      } else if (!sourceNode.sliceId && targetNode.sliceId) {
        gunUpdateNode(sourceId, { sliceId: targetNode.sliceId });
        addToHistory({
          type: 'UPDATE_NODE',
          payload: { id: sourceId, data: { sliceId: targetNode.sliceId } },
          undoPayload: { sliceId: undefined }
        });
      }

      selectLink(id);

      if (document.activeElement instanceof HTMLElement) {
        lastFocusedElementRef.current = document.activeElement;
      }

      setSidebarView('properties');
    }
  }, [nodes, links, modelId, gunAddLink, gunUpdateNode, addToHistory, selectLink]);


  const handleUpdateNode = useCallback((nodeId: string, key: string, value: any) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const oldValue = (node as any)[key];
    const updates: any = { [key]: value };

    // Recalculate height if name changes
    if (key === 'name') {
      const newHeight = calculateNodeHeight(value);
      updates.computedHeight = newHeight;
    }

    gunUpdateNode(nodeId, updates);

    addToHistory({
      type: 'UPDATE_NODE',
      payload: { id: nodeId, data: updates },
      undoPayload: { [key]: oldValue, ...(key === 'name' ? { computedHeight: node.computedHeight } : {}) }
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
    // Weavr Export (Default)
    // const data = exportWeavrProject(nodes, links, slices, autoLayoutEdges || new Map(), modelId || uuidv4(), 'Untitled Project', 'WEAVR');
    const data = {}; // Placeholder
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weavr - project - ${modelId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, links, slices, autoLayoutEdges, modelId]);

  const handleStandardExport = useCallback(() => {
    // Standard Export (Strict Schema)
    // const data = exportWeavrProject(nodes, links, slices, autoLayoutEdges || new Map(), modelId || uuidv4(), 'Untitled Project', 'STANDARD');
    const data = {}; // Placeholder
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event - model - standard - ${modelId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, links, slices, autoLayoutEdges, modelId]);

  const handleImport = useCallback((file: File) => {
    if (!modelId) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') throw new Error('File read error');

        const json = JSON.parse(result);
        // const importedData = importWeavrProject(json);
        const importedData: any = { nodes: [], links: [] }; // Placeholder

        // Support legacy format (direct array of nodes/links) if importWeavrProject returns empty
        const data: ModelData = (importedData.nodes.length > 0) ? importedData : json;

        if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) throw new Error('Invalid file format');

        const model = gunClient.getModel(modelId);

        // Clear existing data
        nodes.forEach(n => model.get('nodes').get(n.id).put(null as any));
        links.forEach(l => model.get('links').get(l.id).put(null as any));
        slices.forEach(s => model.get('slices').get(s.id).put(null as any));
        manualPositionsRef.current.clear();

        // Restore Edge Routes
        if (importedData.edgeRoutes) {
          const routeMap = new Map<string, number[]>();
          Object.entries(importedData.edgeRoutes).forEach(([id, points]) => {
            routeMap.set(id, points as number[]);
          });
          setAutoLayoutEdges(routeMap);
        } else {
          setAutoLayoutEdges(new Map());
        }

        // Restore Slices
        if (data.slices) {
          Object.values(data.slices).forEach(slice => {
            // Ensure nodeIds is not in the put data if it's a Set (Gun handles relations differently or we serialize it)
            // In types.ts Slice has nodeIds: Set<string>. Gun usually stores this as a separate graph or simple array if small.
            // But here we just want to restore the slice metadata.
            // The nodes themselves have sliceId property which links them.
            // Weavr seems to rely on node.sliceId primarily?
            // Let's check Slice definition in types.ts.
            // It has nodeIds: Set<string>.
            // But when we load slices, do we populate nodeIds?
            // In App.tsx `useEffect` for loading slices:
            // It seems we might not be fully using nodeIds Set in the Slice object for logic, but relying on node.sliceId?
            // Actually, let's just save the slice metadata.
            const { nodeIds, ...sliceData } = slice;
            model.get('slices').get(slice.id).put(sliceData as any);
          });
        }

        (data.nodes || []).forEach(node => {
          const { id, ...nodeData } = node;

          // Sanitize nodeData for Gun (remove undefined)
          const sanitizedNodeData: any = {};
          Object.entries(nodeData).forEach(([key, value]) => {
            if (value !== undefined) {
              if (key === 'entityIds' && Array.isArray(value)) {
                sanitizedNodeData[key] = JSON.stringify(value);
              } else {
                sanitizedNodeData[key] = value;
              }
            }
          });

          model.get('nodes').get(id).put(sanitizedNodeData);
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
      const node = nodes.find(n => n.id === selectedNodeIdsArray[0]);
      return node ? { type: 'node' as const, data: node } : null;
    }
    if (selectedNodeIds.length > 1 && !selectedLinkId) {
      const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
      return { type: 'multi-node' as const, data: selectedNodes };
    }
    if (selectedLinkId && selectedNodeIds.length === 0) {
      const link = links.find(l => l.id === selectedLinkId);
      return link ? { type: 'link' as const, data: link } : null;
    }
    return null;
  }, [selectedNodeIds, selectedNodeIdsArray, selectedLinkId, nodes, links]);

  const selectedIds = useMemo(() => {
    return selectedLinkId ? [...selectedNodeIdsArray, selectedLinkId] : selectedNodeIdsArray;
  }, [selectedNodeIdsArray, selectedLinkId]);

  const handleAddSlice = (title: string) => {
    const newSliceId = addSlice(title, slices.length);
    return newSliceId || '';
  };


  const handleCloseSidebar = () => {
    setSidebarView(null);
    setSelection([]);
    selectLink(''); // Assuming selectLink expects a string, passing empty string to clear
  };

  // --- Filtering Logic ---
  const filteredNodes = useMemo(() => {
    if (filteredSliceIds.length === 0) return nodes;

    // Filter nodes based on node.sliceId matching one of the filteredSliceIds
    return nodes.filter(node => node.sliceId && filteredSliceIds.includes(node.sliceId));
  }, [nodes, filteredSliceIds]);

  const filteredLinks = useMemo(() => {
    if (filteredSliceIds.length === 0) return links;
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return links.filter(link => nodeIds.has(link.source) && nodeIds.has(link.target));
  }, [links, filteredNodes, filteredSliceIds]);



  // --- Render ---
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="w-screen h-[100dvh] overflow-hidden relative font-sans bg-gray-50">
        <Header
          onImport={handleImport}
          onExport={handleExport}
          onStandardExport={handleStandardExport}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onAutoLayout={handleAutoLayout}
          onOpenModelList={() => setIsModelListOpen(true)}
          currentModelName={currentModelName}
          onRenameModel={handleRenameModel}
        />

        <div className={isLayoutLoading ? 'cursor-wait' : ''}></div>

        <SliceFilter
          slices={slices}
          selectedSliceIds={filteredSliceIds}
          onChange={setFilteredSliceIds}
        />

        <GraphCanvas
          nodes={filteredNodes}
          links={filteredLinks}
          slices={slices}
          selectedIds={selectedIds}
          edgeRoutes={autoLayoutEdges}
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

        <Sidebar
          isOpen={!!sidebarView}
          onClose={handleCloseSidebar}
          title={sidebarView === 'properties' ? 'Properties' : sidebarView === 'slices' ? 'Slices' : 'Data Dictionary'}
          activeTab={sidebarView || 'properties'}
          onTabChange={(tab) => setSidebarView(tab as any)}
          tabs={[
            { id: 'properties', label: 'Properties', title: 'Alt + P' },
            { id: 'dictionary', label: 'Data', title: 'Alt + D' },
            { id: 'slices', label: 'Slices', title: 'Alt + S' }
          ]}
        >
          {sidebarView === 'properties' && (
            <PropertiesPanel
              selectedItem={selectedItemData}
              onUpdateNode={handleUpdateNode}
              onUpdateLink={handleUpdateLink}
              onDeleteLink={handleDeleteLink}
              onDeleteNode={handleDeleteNode}
              slices={slices}
              onAddSlice={handleAddSlice}
              focusOnRender={focusOnRender}
              onFocusHandled={handleFocusHandled}
              definitions={definitionsArray}
              onAddDefinition={handleAddDefinition}
              modelId={modelId}
            />
          )}
          {sidebarView === 'slices' && (
            <SliceList
              slices={slices}
              definitions={definitionsArray}
              onAddSlice={addSlice}
              onUpdateSlice={updateSlice}
              onDeleteSlice={deleteSlice}
              onManageSlice={(id) => {
                setSliceManagerInitialId(id);
                setIsSliceManagerOpen(true);
              }}
              modelId={modelId}
            />
          )}
          {sidebarView === 'dictionary' && (
            <DataDictionaryList
              definitions={definitions}
              onAddDefinition={handleAddDefinition}
              onUpdateDefinition={handleUpdateDefinition}
              onRemoveDefinition={handleDeleteDefinition}
              modelId={modelId}
            />
          )}
        </Sidebar>

        <WelcomeModal isOpen={isWelcomeModalOpen} onClose={handleCloseWelcomeModal} />
        <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
        <ModelListModal isOpen={isModelListOpen} onClose={() => setIsModelListOpen(false)} currentModelId={modelId} />



        <SliceManagerModal
          isOpen={isSliceManagerOpen}
          onClose={() => {
            setIsSliceManagerOpen(false);
            setSliceManagerInitialId(null);
          }}
          slices={slices}
          onAddSlice={addSlice}
          onUpdateSlice={updateSlice}
          onDeleteSlice={deleteSlice}
          initialViewingSpecsId={sliceManagerInitialId}
        />

        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;