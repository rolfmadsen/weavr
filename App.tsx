import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import GraphCanvas from './components/GraphCanvas';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import Header from './components/Header';
import Footer from './components/Footer';
import { Node, Link, ElementType, ModelData } from './types';
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
  const [selection, setSelection] = useState<{ type: 'node' | 'link'; id: string } | null>(null);
  const [focusOnRender, setFocusOnRender] = useState(false);
  const [showSlices, setShowSlices] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const manualPositionsRef = useRef(new Map<string, { x: number, y: number }>());

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
        // Type-safe construction of the Node object
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
        // Type-safe construction of the Link object
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

  const { slices, nodeSliceMap, swimlanePositions } = useMemo(() => {
    if (!showSlices || nodes.length === 0) {
      return { slices: [], nodeSliceMap: new Map(), swimlanePositions: new Map() };
    }
    const { slices, nodeSliceMap } = sliceService.calculateSlices(nodes, links);
    const swimlanePositions = layoutService.calculateSwimlaneLayout(slices, nodes, links, window.innerWidth);
    return { slices, nodeSliceMap, swimlanePositions };
  }, [showSlices, nodes, links]);

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

    setSelection({ type: 'node', id });
    setFocusOnRender(true);
  }, [modelId, showSlices]);

  const handleNodeClick = useCallback((node: Node) => {
    setSelection({ type: 'node', id: node.id });
    setFocusOnRender(false);
  }, []);

  const handleLinkClick = useCallback((link: Link) => {
    setSelection({ type: 'link', id: link.id });
    setFocusOnRender(false);
  }, []);

  const handleNodeDoubleClick = useCallback((node: Node) => {
    setSelection({ type: 'node', id: node.id });
    setFocusOnRender(true);
  }, []);

  const handleLinkDoubleClick = useCallback((link: Link) => {
    setSelection({ type: 'link', id: link.id });
    setFocusOnRender(true);
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
    setSelection({ type: 'link', id });
    setFocusOnRender(true);
  }, [nodes, links, modelId]);

  const handleUpdateNode = useCallback((nodeId: string, key: string, value: any) => {
    if (!modelId) return;

    // Optimistic UI update for instant feedback
    setNodes(currentNodes =>
      currentNodes.map(node => (node.id === nodeId ? { ...node, [key]: value } : node))
    );
    
    // Persist granular change to GunDB. Gun will merge this into the node data.
    gunService.getModel(modelId).get('nodes').get(nodeId).put({ [key]: value });
  }, [modelId]);
  
  const handleUpdateLink = useCallback((linkId: string, key: string, value: any) => {
    if (!modelId) return;

    // Optimistic UI update for instant feedback
    setLinks(currentLinks =>
      currentLinks.map(link => (link.id === linkId ? { ...link, [key]: value } : link))
    );
    
    // Persist granular change to GunDB.
    gunService.getModel(modelId).get('links').get(linkId).put({ [key]: value });
  }, [modelId]);

  const handleDeleteLink = useCallback((linkId: string) => {
    if (!modelId) return;
    gunService.getModel(modelId).get('links').get(linkId).put(null as any);
    if (selection?.id === linkId) setSelection(null);
  }, [modelId, selection]);

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

    if (selection?.id === nodeId) setSelection(null);
  }, [modelId, links, selection]);

  const handleNodeDrag = useCallback((nodeId: string, x: number, y: number) => {
    if (showSlices || !modelId) return;
    manualPositionsRef.current.set(nodeId, { x, y });
    gunService.getModel(modelId).get('nodes').get(nodeId).put({ fx: x, fy: y } as any);
  }, [showSlices, modelId]);

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
            
            setSelection(null);
        } catch (error) {
            alert('Failed to import model: ' + (error as Error).message);
        }
    };
    reader.readAsText(file);
  }, [modelId, nodes, links]);

  const handleClosePanel = useCallback(() => setSelection(null), []);
  const handleCanvasClick = useCallback(() => setSelection(null), []);
  const handleFocusHandled = useCallback(() => setFocusOnRender(false), []);

  const selectedItemData = useMemo(() => {
    if (!selection) return null;
    if (selection.type === 'node') {
      const node = nodes.find(n => n.id === selection.id);
      return node ? { type: 'node' as const, data: node } : null;
    } else {
      const link = links.find(l => l.id === selection.id);
      return link ? { type: 'link' as const, data: link } : null;
    }
  }, [selection, nodes, links]);

  return (
    <div className="w-screen h-[100dvh] overflow-hidden relative font-sans">
      <Header onImport={handleImport} onExport={handleExport} onToggleSlices={handleToggleSlices} slicesVisible={showSlices} />
      <GraphCanvas 
          nodes={nodes} 
          links={links}
          selectedId={selection?.id ?? null}
          slices={slices}
          nodeSliceMap={nodeSliceMap}
          swimlanePositions={swimlanePositions}
          showSlices={showSlices}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onLinkDoubleClick={handleLinkDoubleClick}
          onNodeDrag={handleNodeDrag}
          onAddLink={handleAddLink}
          onCanvasClick={handleCanvasClick}
      />
      <Toolbar onAddNode={handleAddNode} disabled={!isReady} />
      
      {/* Backdrop for mobile, shown when panel is open */}
      {selectedItemData && <div onClick={handleClosePanel} className="fixed inset-0 bg-black/30 z-20 md:hidden" />}

      {/* Wrapper for PropertiesPanel. Controls position, animation, and interaction blocking. */}
      <div 
        className={`
          fixed bottom-0 left-0 right-0 h-[85vh]
          md:top-0 md:bottom-auto md:left-auto md:h-full md:w-96
          transition-transform duration-300 ease-in-out z-30
          ${!selectedItemData && 'pointer-events-none'} 
          ${selectedItemData ? 'translate-y-0 translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}
        `}
      >
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
      <Footer />
    </div>
  );
};

export default App;