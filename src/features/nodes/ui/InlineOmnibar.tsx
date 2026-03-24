import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Settings2, Trash2, X } from 'lucide-react';
import { Node, Link, Slice, ElementType } from '../../modeling/domain/types';
import validationService from '../../modeling/domain/validation';
import SmartSelect from '../../../shared/components/SmartSelect';
import { GlassTooltip } from '../../../shared/components/GlassTooltip';
import { useDebouncedInput } from '../../../shared/hooks/useDebouncedInput';
import { cn } from '../../../shared/lib/utils';

// ─── Props ───────────────────────────────────────────────────────────
interface InlineOmnibarProps {
  // Target
  targetKind: 'node' | 'link';
  node?: Node;
  link?: Link;
  // Position (screen coordinates)
  position: { x: number; y: number; nodeY: number; stageY: number; scale: number };
  // Data
  slices: Slice[];
  allNodes: Node[];
  allLinks: Link[];
  // Callbacks
  onUpdateNode: <K extends keyof Node>(id: string, key: K, value: Node[K]) => void;
  onUpdateLink: <K extends keyof Link>(id: string, key: K, value: Link[K]) => void;
  onAddLink: (sourceId: string, targetId: string) => void;
  onDeleteLink: (linkId: string) => void;
  onAddSlice: (title: string) => string;
  onSpawnAndLink: (sourceNodeId: string, targetType: ElementType, name: string) => void;
  onClose: () => void;
  onOpenSidebar: () => void;
  initialFocus?: 'name' | 'relation';
}

// ─── Placeholders by Element Type ────────────────────────────────────
const NAME_PLACEHOLDER_KEYS: Record<string, string> = {
  SCREEN: 'InlineOmnibar.namePlaceholder.SCREEN',
  COMMAND: 'InlineOmnibar.namePlaceholder.COMMAND',
  DOMAIN_EVENT: 'InlineOmnibar.namePlaceholder.DOMAIN_EVENT',
  READ_MODEL: 'InlineOmnibar.namePlaceholder.READ_MODEL',
  INTEGRATION_EVENT: 'InlineOmnibar.namePlaceholder.INTEGRATION_EVENT',
  AUTOMATION: 'InlineOmnibar.namePlaceholder.AUTOMATION',
};

// ─── Component ───────────────────────────────────────────────────────
export const InlineOmnibar: React.FC<InlineOmnibarProps> = ({
  targetKind,
  node,
  link,
  position,
  slices,
  allNodes,
  allLinks,
  onUpdateNode,
  onUpdateLink,
  onAddLink,
  onDeleteLink,
  onAddSlice,
  onSpawnAndLink,
  onClose,
  onOpenSidebar,
  initialFocus,
}) => {
  const { t } = useTranslation();

  // ─── NODE MODE ──────────────────────────────────────────────────
  if (targetKind === 'node' && node) {
    return createPortal(
      <NodeOmnibar
        node={node}
        position={position}
        slices={slices}
        allNodes={allNodes}
        allLinks={allLinks}
        onUpdateNode={onUpdateNode}
        onAddLink={onAddLink}
        onDeleteLink={onDeleteLink}
        onAddSlice={onAddSlice}
        onSpawnAndLink={onSpawnAndLink}
        onClose={onClose}
        onOpenSidebar={onOpenSidebar}
        t={t}
        initialFocus={initialFocus}
      />,
      document.body
    );
  }

  // ─── EDGE MODE ──────────────────────────────────────────────────
  if (targetKind === 'link' && link) {
    return createPortal(
      <EdgeOmnibar
        link={link}
        position={position}
        onUpdateLink={onUpdateLink}
        onClose={onClose}
        onOpenSidebar={onOpenSidebar}
        t={t}
        initialFocus={initialFocus}
      />,
      document.body
    );
  }

  return null;
};

// ═══════════════════════════════════════════════════════════════════════
// NODE OMNIBAR SUB-COMPONENT
// ═══════════════════════════════════════════════════════════════════════
interface NodeOmnibarProps {
  node: Node;
  position: { x: number; y: number; nodeY: number; stageY: number; scale: number };
  slices: Slice[];
  allNodes: Node[];
  allLinks: Link[];
  onUpdateNode: <K extends keyof Node>(id: string, key: K, value: Node[K]) => void;
  onAddLink: (sourceId: string, targetId: string) => void;
  onDeleteLink: (linkId: string) => void;
  onAddSlice: (title: string) => string;
  onSpawnAndLink: (sourceNodeId: string, targetType: ElementType, name: string) => void;
  onClose: () => void;
  onOpenSidebar: () => void;
  t: (key: string, options?: any) => string;
  initialFocus?: 'name' | 'relation';
}

const NodeOmnibar: React.FC<NodeOmnibarProps> = ({
  node,
  position,
  slices,
  allNodes,
  allLinks,
  onUpdateNode,
  onAddLink,
  onDeleteLink,
  onAddSlice,
  onSpawnAndLink,
  onClose,
  onOpenSidebar,
  t,
  initialFocus,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const sliceTriggerRef = useRef<HTMLButtonElement>(null);
  const relationTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [hasAutoFilledSlice, setHasAutoFilledSlice] = useState(false);

  // Live Position & Dynamic Height
  const currentPosition = position;




  // Name management
  const nameInputGroup = useDebouncedInput(
    node.name || '',
    (val) => onUpdateNode(node.id, 'name', val),
  );

  // Auto-slice
  useEffect(() => {
    if (node.type !== ElementType.DomainEvent || hasAutoFilledSlice) return;
    if (node.sliceId) return;
    const currentName = nameInputGroup.value;
    if (!currentName || !currentName.includes(' ')) return;
    const words = currentName.trim().split(/\s+/);
    if (words.length < 2) return;
    const firstWord = words[0];
    if (!/^[A-Z]/.test(firstWord)) return;
    const existingSlice = slices.find((s) => (s.title || '').toLowerCase() === firstWord.toLowerCase());
    if (existingSlice) onUpdateNode(node.id, 'sliceId', existingSlice.id);
    else { const id = onAddSlice(firstWord); onUpdateNode(node.id, 'sliceId', id); }
    setHasAutoFilledSlice(true);
  }, [nameInputGroup.value, node.type, node.sliceId, slices, onUpdateNode, onAddSlice]);

  // Slices
  const sliceOptions = useMemo(() => slices.map((s) => ({ id: s.id, label: s.title || t('common.untitled'), color: s.color })), [slices, t]);
  const handleSliceCreate = useCallback((name: string) => {
    const existing = slices.find((s) => (s.title || '').toLowerCase() === name.toLowerCase());
    return existing ? existing.id : onAddSlice(name);
  }, [slices, onAddSlice]);
  const handleSliceChange = useCallback((id: string) => onUpdateNode(node.id, 'sliceId', id || undefined), [node.id, onUpdateNode]);

  // Relationships
  const validRules = useMemo(() => validationService.getRules().filter((r) => r.source === node.type), [node.type]);

  // Focus
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onOpenSidebar();
    }
    

    if (e.key === 'Tab') {
      // Isolate Tab to the Omnibar
      e.preventDefault();
      e.stopPropagation();

      const focusables = [
        nameInputRef.current, 
        sliceTriggerRef.current, 
        ...validRules.map(r => relationTriggerRefs.current[`${r.source}-${r.target}`])
      ].filter(Boolean) as HTMLElement[];
      const idx = focusables.indexOf(document.activeElement as HTMLElement);

      if (idx !== -1) {
        const nextIdx = (idx + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
        focusables[nextIdx].focus();
      } else {
        // Fallback to first element if none focused
        focusables[0]?.focus();
      }
    }
  }, [onClose, onOpenSidebar]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as globalThis.Node)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => { 
    setTimeout(() => {
      if (initialFocus === 'relation' && validRules.length > 0) {
        const firstRule = validRules[0];
        const ref = relationTriggerRefs.current[`${firstRule.source}-${firstRule.target}`];
        if (ref) {
          ref.focus();
          return;
        }
      }
      nameInputRef.current?.focus();
    }, 50); 
  }, [initialFocus, validRules]);

  // Position & Layout
  const OMNIBAR_WIDTH = 320;
  const GAP_ABOVE_NODE = 16;
  const style: React.CSSProperties = {
    position: 'fixed',
    left: currentPosition.x,
    top: currentPosition.y - GAP_ABOVE_NODE,
    width: OMNIBAR_WIDTH,
    zIndex: 100,
    transform: 'translate(-50%, -100%)',
    transition: 'none',
  };


  const placeholderKey = NAME_PLACEHOLDER_KEYS[node.type] || 'InlineOmnibar.namePlaceholder.COMMAND';
  const dynamicPlaceholder = useMemo(() => {
    if (node.type === ElementType.DomainEvent) {
      return t('InlineOmnibar.namePlaceholder.DOMAIN_EVENT_example');
    }
    return t(placeholderKey);
  }, [node.type, t, placeholderKey]);

  return (
    <div
      ref={containerRef}
      style={style}
      className={cn(
        "glass-card shadow-2xl rounded-[32px] flex flex-col gap-4 animate-in fade-in duration-200 backdrop-blur-3xl bg-white/92 dark:bg-neutral-900/92",
        "border px-6 py-6 relative ring-1 ring-black/5 dark:ring-white/5",
        node.type === ElementType.DomainEvent && "border-t-[6px] border-orange-500",
        node.type === ElementType.Command && "border-t-[6px] border-blue-500",
        node.type === ElementType.ReadModel && "border-t-[6px] border-green-500",
        node.type === ElementType.Screen && "border-t-[6px] border-blue-400",
        node.type === ElementType.IntegrationEvent && "border-t-[6px] border-purple-500",
        node.type === ElementType.Automation && "border-t-[6px] border-pink-500"
      )}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-black text-slate-500 dark:text-neutral-400 uppercase tracking-[0.2em] opacity-60">
            {t(`modeling.elements.${node.type}`)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <GlassTooltip content={t('InlineOmnibar.propertiesHint', 'Open Properties (Ctrl + Enter)')}>
            <button
              type="button"
              onClick={() => { onClose(); onOpenSidebar(); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <Settings2 size={14} />
            </button>
          </GlassTooltip>
          <GlassTooltip content={t('InlineOmnibar.closeHint', 'Esc or click canvas to close')}>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={14} />
            </button>
          </GlassTooltip>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400/80 px-1">
            {t('InlineOmnibar.nameLabel', { type: t(`modeling.elements.${node.type}`) })}
          </div>
          <input
            ref={nameInputRef}
            type="text"
            {...nameInputGroup}
            placeholder={dynamicPlaceholder}
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                sliceTriggerRef.current?.focus();
              }
            }}
            className={cn(
              'w-full h-11 px-4 rounded-xl text-sm font-bold',
              'bg-white/80 dark:bg-neutral-800/60 border border-white/40 dark:border-neutral-700/50',
              'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 shadow-sm',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all',
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400/80 px-1">
            {t('InlineOmnibar.sliceLabel')}
          </div>
          <SmartSelect
            ref={sliceTriggerRef}
            key={`slice-select-${node.id}`}
            options={sliceOptions}
            value={node.sliceId || ''}
            onChange={handleSliceChange}
            onCreate={handleSliceCreate}
            placeholder={t('InlineOmnibar.slicePlaceholder')}
            allowCustomValue={false}
            align="start"
            className="h-11 text-sm font-bold rounded-xl bg-white/80 dark:bg-neutral-800/60 shadow-sm border border-white/20 dark:border-neutral-700/30 w-full"
          />
        </div>

        {validRules.length > 0 && (
          <div className="flex flex-col gap-4 mt-2 border-t border-slate-200 dark:border-neutral-700 pt-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-neutral-500 px-1 opacity-60">
              {t('properties.relationships')}
            </div>
            {validRules.map((rule) => {
              const ruleKey = `${rule.source}-${rule.target}`;
              const ruleConnectedNodes = allNodes.filter(n => 
                n.type === rule.target && 
                allLinks.some(l => l.source === node.id && l.target === n.id)
              );
              const ruleTargetOptions = allNodes
                .filter(n => n.type === rule.target && !ruleConnectedNodes.some(cn => cn.id === n.id))
                .map(n => ({ id: n.id, label: n.name || t('common.untitled') }));

              const targetTitle = t(`modeling.elements.${rule.target.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`);

              return (
                <div key={ruleKey} className="flex flex-col gap-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400/80 px-1 flex items-center gap-2">
                    {t('InlineOmnibar.linkLabel', { type: targetTitle })}
                  </div>

                  {ruleConnectedNodes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-0.5">
                      {ruleConnectedNodes.map((cn) => (
                        <span key={cn.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-black border border-blue-500/20">
                          {cn.name || t('common.untitled')}
                          <button 
                            type="button" 
                            onClick={() => { 
                              const linkToDelete = allLinks.find(l => l.source === node.id && l.target === cn.id); 
                              if (linkToDelete) onDeleteLink(linkToDelete.id); 
                            }} 
                            className="opacity-40 hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity ml-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <SmartSelect
                    ref={(el) => { relationTriggerRefs.current[ruleKey] = el; }}
                    key={`relation-select-${node.id}-${rule.target}`}
                    options={ruleTargetOptions}
                    value=""
                    onChange={(id: string) => { if (id) onAddLink(node.id, id); }}
                    onCreate={(name: string) => onSpawnAndLink(node.id, rule.target, name)}
                    placeholder={t('InlineOmnibar.linkPlaceholder')}
                    allowCustomValue={false}
                    align="start"
                    className="h-11 text-sm font-bold rounded-xl bg-white/80 dark:bg-neutral-800/60 shadow-sm border border-white/20 dark:border-neutral-700/30 w-full"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// EDGE OMNIBAR
// ═══════════════════════════════════════════════════════════════════════
interface EdgeOmnibarProps { link: Link; position: { x: number; y: number; nodeY: number; stageY: number; scale: number }; onUpdateLink: <K extends keyof Link>(id: string, key: K, value: Link[K]) => void; onClose: () => void; onOpenSidebar: () => void; t: (key: string, options?: any) => string; initialFocus?: 'name' | 'relation'; }
const EdgeOmnibar: React.FC<EdgeOmnibarProps> = ({ link, position, onUpdateLink, onClose, onOpenSidebar, t }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);
  const labelInputGroup = useDebouncedInput(link.label || '', (val) => onUpdateLink(link.id, 'label', val));
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { onClose(); onOpenSidebar(); }
    if (e.key === 'Tab') {
      const focusables = [inputRef.current, settingsBtnRef.current].filter(Boolean) as HTMLElement[];
      const idx = focusables.indexOf(document.activeElement as HTMLElement);
      if (idx !== -1) { e.preventDefault(); focusables[(idx + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length].focus(); }
    }
  }, [onClose, onOpenSidebar]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as globalThis.Node)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  const [contentHeight, setContentHeight] = useState(50);
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) { setContentHeight(entry.contentRect.height); }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const OMNIBAR_WIDTH = 260;
  const style: React.CSSProperties = { 
    position: 'fixed', 
    left: position.x, 
    top: Math.max(80, position.y - contentHeight + 10), 
    width: OMNIBAR_WIDTH, 
    zIndex: 100,
    transform: 'translateX(-50%)',
  };
  return createPortal(
    <div ref={containerRef} style={style} onKeyDown={handleKeyDown} className="glass-card shadow-2xl rounded-[24px] p-3.5 flex items-center gap-3 animate-in fade-in duration-150 backdrop-blur-3xl bg-white/90 dark:bg-neutral-900/90 border ring-1 ring-black/5">
      <input ref={inputRef} type="text" {...labelInputGroup} placeholder={t('InlineOmnibar.edgeLabelPlaceholder')} autoComplete="off" className="flex-1 h-11 px-4 rounded-xl text-sm font-bold bg-white/80 dark:bg-neutral-800/60 border border-white/40 dark:border-neutral-700/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"/>
      <button ref={settingsBtnRef} type="button" onClick={() => { onClose(); onOpenSidebar(); }} className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-neutral-700/50 transition-all shadow-sm border border-white/40 dark:border-neutral-700/50"><Settings2 size={18}/></button>
    </div>,
    document.body
  );
};
