import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import GraphCanvas from './components/GraphCanvas';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import Header from './components/Header';
import Footer from './components/Footer';
import HelpModal from './components/HelpModal';
import { Node, Link, ElementType, ModelData } from './types';
import { GRID_SIZE } from './constants';
import validationService from './services/validationService';
import sliceService from './services/sliceService';
import layoutService from './services/layoutService';
import gunService from './services/gunService';

function getModelIdFromUrl(): string {
  const hash = window.location.hash.slice(1);
  if (hash) return hash;
  const newId = uuidv4();
  window.location.hash = newId;
  return newId;
}

const App: React.FC = () => {
  const [modelId, setModelId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [focusOnRender, setFocusOnRender] = useState(false);
  const [showSlices, setShowSlices] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  const manualPositionsRef = React.useRef(new Map<string, { x: number, y: number }>());

  useEffect(() => {
    if (localStorage.getItem('weavr-help-shown') !== 'true') {
        setIsHelpModalOpen(true);
    }
  }, []);

  useEffect(() => {
    const id = getModelIdFromUrl();
    setModelId(id);

    const handleHashChange = () => {
      window.location.reload();
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!modelId) return;

    const model = gunService.getModel(modelId);
    
    const tempNodes = new Map<string, Node>();
    model.get('nodes').map().on((nodeData: any, nodeId: string) => {
      if (nodeData === null) {
        tempNodes.delete(nodeId);
      } else if (nodeData && typeof nodeData === 'object' && nodeData.type && nodeData.name) {
        const newNode: Node = {
          id: nodeId,
          type: nodeData.type,
          name: nodeData.name,
          description: nodeData.description || '',
          x: typeof nodeData.x === 'number' ? nodeData.x : undefined,
          y: typeof nodeData.y === 'number' ? nodeData.y : undefined,
          fx: typeof nodeData.fx === 'number' ? nodeData.fx : null,
          fy: typeof nodeData.fy === 'number' ? nodeData.fy : null,
        };
        tempNodes.set(nodeId, newNode);
      }
      setNodes(Array.from(tempNodes.values()));
    });

    const tempLinks = new Map<string, Link>();
    model.get('links').map().on((linkData: any, linkId: string) => {
      if (linkData === null) {
        tempLinks.delete(linkId);
      } else if (linkData && typeof linkData === 'object' && linkData.source && linkData.target) {
        const newLink: Link = {
          id: linkId,
          source: linkData.source,
          target: linkData.target,
          label: linkData.label || '',
        };
        tempLinks.set(linkId, newLink);
      }
      setLinks(Array.from(tempLinks.values()));
    });
    
    setTimeout(() => setIsReady(true), 500);

  }, [modelId]);


  const handleClosePanel = useCallback(() => {
    if (document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }
    setIsPanelOpen(false);
  }, []);

  const handleAddNode = useCallback((type: ElementType) => {
    if (!modelId) return;
    const model = gunService.getModel(modelId);

    const manualX = window.innerWidth / 2 + (Math.random() - 0.5) * 50;
    const manualY = window.innerHeight / 2 + (Math.random() - 0.5) * 50;
    const id = uuidv4();
    
    const formattedTypeName = type.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    
    const newNodeData: Omit<Node, 'id'> = {
      type,
      name: `New ${formattedTypeName}`,
      description: '',
      x: manualX,
      y: manualY,
      fx: showSlices ? null : manualX,
      fy: showSlices ? null : manualY,
    };
    
    model.get('nodes').get(id).put(newNodeData as any);
    manualPositionsRef.current.set(id, { x: manualX, y: manualY });

    setSelectedNodeIds([id]);
    setSelectedLinkId(null);
    setIsPanelOpen(true);
    setFocusOnRender(true);
    setIsToolbarOpen(false);
  }, [modelId, showSlices]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (!modelId) return;
    const model = gunService.getModel(modelId);
    
    manualPositionsRef.current.delete(nodeId);
    model.get('nodes').get(nodeId).put(null as any);

    links.forEach(link => {
      if (link.source === nodeId || link.target === nodeId) {
        model.get('links').get(link.id).put(null as any);
      }
    });

    setSelectedNodeIds(ids => ids.filter(id => id !== nodeId));
    handleClosePanel();
  }, [modelId, links, handleClosePanel]);

  const handleDeleteLink = useCallback((linkId: string) => {
    if (!modelId) return;
    gunService.getModel(modelId).get('links').get(linkId).put(null as any);
    setSelectedLinkId(null);
    handleClosePanel();
  }, [modelId, handleClosePanel]);
  
  const handleDeleteSelection = useCallback(() => {
    if (!modelId) return;
    const model = gunService.getModel(modelId);

    if (selectedNodeIds.length > 0) {
      const nodeIdsToDelete = new Set(selectedNodeIds);
      nodeIdsToDelete.forEach(nodeId => {
        manualPositionsRef.current.delete(nodeId);
        model.get('nodes').get(nodeId).put(null as any);
      });

      const linksToDelete = new Set<string>();
      links.forEach(link => {
        if (nodeIdsToDelete.has(link.source) || nodeIdsToDelete.has(link.target)) {
          linksToDelete.add(link.id);
        }
      });
      linksToDelete.forEach(linkId => model.get('links').get(linkId).put(null as any));
      
      setSelectedNodeIds([]);
    }

    if (selectedLinkId) {
      model.get('links').get(selectedLinkId).put(null as any);
      setSelectedLinkId(null);
    }
    
    handleClosePanel();
  }, [modelId, selectedNodeIds, selectedLinkId, links, handleClosePanel]);

  const handleNodesDrag = useCallback((updates: { nodeId: string; pos: { x: number; y: number } }[]) => {
    if (showSlices || !modelId) return;
    const model = gunService.getModel(modelId);
    updates.forEach(({ nodeId, pos }) => {
        manualPositionsRef.current.set(nodeId, { x: pos.x, y: pos.y });
        model.get('nodes').get(nodeId).put({ fx: pos.x, fy: pos.y } as any);
    });
  }, [showSlices, modelId]);
  
  const handleNodeClick = useCallback((node: Node) => {
    if (selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id)) {
        return;
    }
    setSelectedLinkId(null);
    setSelectedNodeIds([node.id]);
    setIsPanelOpen(false);
    setIsToolbarOpen(false);
  }, [selectedNodeIds]);
  
  const handleOpenPropertiesPanel = useCallback(() => {
    if (selectedNodeIds.length === 1 || selectedLinkId) {
      setIsPanelOpen(true);
      setFocusOnRender(true);
      setIsToolbarOpen(false);
    }
  }, [selectedNodeIds, selectedLinkId]);

  const { slices, nodeSliceMap, swimlanePositions } = useMemo(() => {
    if (!showSlices || nodes.length === 0) {
      return { slices: [], nodeSliceMap: new Map(), swimlanePositions: new Map() };
    }
    const { slices, nodeSliceMap } = sliceService.calculateSlices(nodes, links);
    const swimlanePositions = layoutService.calculateSwimlaneLayout(slices, nodes, links, window.innerWidth);
    return { slices, nodeSliceMap, swimlanePositions };
  }, [showSlices, nodes, links]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isPanelOpen) {
          handleClosePanel();
        } else if (selectedNodeIds.length > 0 || selectedLinkId) {
          setSelectedNodeIds([]);
          setSelectedLinkId(null);
        }
        if (isToolbarOpen) {
          setIsToolbarOpen(false);
        }
        event.preventDefault();
        return;
      }

      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      let shouldPreventDefault = false;

      switch (event.key) {
        case 'Enter':
          if (selectedNodeIds.length === 1 || selectedLinkId) {
            handleOpenPropertiesPanel();
            shouldPreventDefault = true;
          }
          break;

        case 'Tab':
          if (nodes.length > 0) {
            const getNodePosition = (node: Node) => {
                if (showSlices) {
                    return swimlanePositions.get(node.id) || { x: node.x ?? 0, y: node.y ?? 0 };
                }
                return { x: node.fx ?? node.x ?? 0, y: node.fy ?? node.y ?? 0 };
            };

            const sortedNodes = [...nodes].sort((a, b) => {
                const posA = getNodePosition(a);
                const posB = getNodePosition(b);
                if (posA.y !== posB.y) return posA.y - posB.y;
                return posA.x - posB.x;
            });
            
            let currentIndex = -1;
            if (selectedNodeIds.length === 1) {
                currentIndex = sortedNodes.findIndex(n => n.id === selectedNodeIds[0]);
            }

            const nextIndex = event.shiftKey
                ? (currentIndex - 1 + sortedNodes.length) % sortedNodes.length
                : (currentIndex + 1) % sortedNodes.length;
            
            const nextNode = sortedNodes[nextIndex];
            if (nextNode) {
                handleNodeClick(nextNode);
            }
            shouldPreventDefault = true;
          }
          break;

        case 'Delete':
        case 'Backspace':
          if (selectedNodeIds.length > 0 || selectedLinkId) {
            handleDeleteSelection();
            shouldPreventDefault = true;
          }
          break;

        case 'a': case 'A': case 'n': case 'N':
          if (!(event.metaKey || event.ctrlKey)) {
            if (isReady) setIsToolbarOpen(prev => !prev);
            shouldPreventDefault = true;
          }
          break;

        case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight':
          if (selectedNodeIds.length > 0 && !showSlices) {
            const model = gunService.getModel(modelId!);
            const updates = new Map<string, { fx: number, fy: number }>();
            
            let dx = 0, dy = 0;
            if (event.key === 'ArrowUp') dy = -GRID_SIZE;
            if (event.key === 'ArrowDown') dy = GRID_SIZE;
            if (event.key === 'ArrowLeft') dx = -GRID_SIZE;
            if (event.key === 'ArrowRight') dx = GRID_SIZE;

            if (dx !== 0 || dy !== 0) {
              nodes.forEach(node => {
                if (selectedNodeIds.includes(node.id)) {
                  const currentX = node.fx ?? node.x ?? 0;
                  const currentY = node.fy ?? node.y ?? 0;
                  const newPos = { fx: currentX + dx, fy: currentY + dy };
                  updates.set(node.id, newPos);
                  manualPositionsRef.current.set(node.id, { x: newPos.fx, y: newPos.fy });
                }
              });

              updates.forEach((pos, id) => model.get('nodes').get(id).put(pos as any));
              shouldPreventDefault = true;
            }
          }
          break;
      }

      if (isToolbarOpen) {
        const tools = [ElementType.Screen, ElementType.Command, ElementType.EventInternal, ElementType.ReadModel, ElementType.EventExternal];
        const keyIndex = parseInt(event.key, 10) - 1;
        if (keyIndex >= 0 && keyIndex < tools.length) {
          handleAddNode(tools[keyIndex]);
          shouldPreventDefault = true;
        }
      }

      if (shouldPreventDefault) event.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen, isToolbarOpen, isReady, selectedNodeIds, selectedLinkId, handleDeleteSelection, handleAddNode, showSlices, nodes, handleNodesDrag, handleOpenPropertiesPanel, swimlanePositions, handleClosePanel, links, modelId, handleNodeClick]);


  const handleToggleSlices = useCallback(() => {
    if (!modelId) return;
    const model = gunService.getModel(modelId);
    const isEnabling = !showSlices;
    if (isEnabling) {
      nodes.forEach(n => {
        model.get('nodes').get(n.id).put({ fx: null, fy: null });
      });
    } else {
      nodes.forEach(n => {
        const manualPos = manualPositionsRef.current.get(n.id);
        if (manualPos) {
          model.get('nodes').get(n.id).put({ fx: manualPos.x, fy: manualPos.y });
        }
      });
    }
    setShowSlices(isEnabling);
  }, [showSlices, nodes, modelId]);

  const handleLinkClick = useCallback((link: Link) => {
    setSelectedNodeIds([]);
    setSelectedLinkId(link.id);
    setIsPanelOpen(false);
    setIsToolbarOpen(false);
  }, []);

  const handleNodeDoubleClick = useCallback((node: Node) => {
    setSelectedNodeIds([node.id]);
    setSelectedLinkId(null);
    handleOpenPropertiesPanel();
  }, [handleOpenPropertiesPanel]);

  const handleLinkDoubleClick = useCallback((link: Link) => {
    setSelectedNodeIds([]);
    setSelectedLinkId(link.id);
    handleOpenPropertiesPanel();
  }, [handleOpenPropertiesPanel]);
  
  const handleMarqueeSelect = useCallback((nodeIds: string[]) => {
      setSelectedNodeIds(nodeIds);
      setSelectedLinkId(null);
      setIsPanelOpen(false);
  }, []);

  const handleAddLink = useCallback((sourceId: string, targetId: string) => {
    if (!modelId || sourceId === targetId) return;
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);

    if (!sourceNode || !targetNode) return;
    const rule = validationService.getConnectionRule(sourceNode, targetNode);
    if (!rule) return;
    if (links.some(l => l.source === sourceId && l.target === targetId)) return;

    const id = uuidv4();
    const newLinkData: Omit<Link, 'id'> = { source: sourceId, target: targetId, label: rule.verb };
    
    gunService.getModel(modelId).get('links').get(id).put(newLinkData as any);
    setSelectedNodeIds([]);
    setSelectedLinkId(id);
    setIsPanelOpen(true);
    setFocusOnRender(true);
  }, [nodes, links, modelId]);

  const handleUpdateNode = useCallback((nodeId: string, key: string, value: any) => {
    if (!modelId) return;
    setNodes(currentNodes => currentNodes.map(node => (node.id === nodeId ? { ...node, [key]: value } : node)));
    gunService.getModel(modelId).get('nodes').get(nodeId).put({ [key]: value });
  }, [modelId]);
  
  const handleUpdateLink = useCallback((linkId: string, key: string, value: any) => {
    if (!modelId) return;
    setLinks(currentLinks => currentLinks.map(link => (link.id === linkId ? { ...link, [key]: value } : link)));
    gunService.getModel(modelId).get('links').get(linkId).put({ [key]: value });
  }, [modelId]);

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
            
            setSelectedNodeIds([]);
            setSelectedLinkId(null);
            handleClosePanel();
        } catch (error) {
            alert('Failed to import model: ' + (error as Error).message);
        }
    };
    reader.readAsText(file);
  }, [modelId, nodes, links, handleClosePanel]);

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (!event.shiftKey) {
        setSelectedNodeIds([]);
        setSelectedLinkId(null);
        handleClosePanel();
        setIsToolbarOpen(false);
    }
  }, [handleClosePanel]);

  const handleFocusHandled = useCallback(() => setFocusOnRender(false), []);

  const handleCloseHelpModal = useCallback(() => {
    setIsHelpModalOpen(false);
    localStorage.setItem('weavr-help-shown', 'true');
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
      <Header onImport={handleImport} onExport={handleExport} onToggleSlices={handleToggleSlices} slicesVisible={showSlices} onOpenHelp={() => setIsHelpModalOpen(true)} />
      <GraphCanvas 
          nodes={nodes} 
          links={links}
          selectedIds={selectedIds}
          slices={slices}
          nodeSliceMap={nodeSliceMap}
          swimlanePositions={swimlanePositions}
          showSlices={showSlices}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onLinkDoubleClick={handleLinkDoubleClick}
          onNodesDrag={handleNodesDrag}
          onAddLink={handleAddLink}
          onCanvasClick={handleCanvasClick}
          onMarqueeSelect={handleMarqueeSelect}
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
      <HelpModal isOpen={isHelpModalOpen} onClose={handleCloseHelpModal} />
      <Footer />
    </div>
  );
};

export default App;