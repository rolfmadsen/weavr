import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, ChevronLeft, CheckSquare, Square, ArrowRight } from 'lucide-react';
import { DataDefinition, DefinitionType, Field } from '../../modeling/domain/types';
import {
  useFlattenedDictionary,
  SearchableAttribute,
  SearchableEntity,
  SearchableItem,
} from '../../dictionary/store/useFlattenedDictionary';

// ─── Props ───────────────────────────────────────────────────────────
interface InlineOmnibarProps {
  definitions: DataDefinition[];
  existingFields: Field[];
  onAddFields: (fields: Field[]) => void;
  onCreateOrphan: (name: string) => string; // returns new definition id
  availableFields?: string[]; // ICC: Fields present in incoming Read Models
  isScreen?: boolean;
}

// ─── Color helper ────────────────────────────────────────────────────
const getTypeColor = (type: DefinitionType) => {
  switch (type) {
    case DefinitionType.Aggregate:  return 'bg-emerald-500';
    case DefinitionType.Entity:     return 'bg-blue-500';
    case DefinitionType.ValueObject: return 'bg-purple-500';
    case DefinitionType.Enum:       return 'bg-amber-500';
    default:                        return 'bg-gray-400';
  }
};

export const InlineOmnibar: React.FC<InlineOmnibarProps> = ({
  definitions,
  existingFields,
  onAddFields,
  onCreateOrphan,
  availableFields = [],
  isScreen = false,
}) => {
  const { t } = useTranslation();
  // Search state
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // Entity drill-down state
  const [drillEntity, setDrillEntity] = useState<SearchableEntity | null>(null);
  const [selectedAttrs, setSelectedAttrs] = useState<Set<string>>(new Set());

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Flattened dictionary
  const { attributes, entities } = useFlattenedDictionary(definitions, query);

  // Build the flat option list for keyboard navigation
  const flatOptions = useMemo((): (SearchableItem & { _id: string })[] => {
    if (drillEntity) return [];
    const items: (SearchableItem & { _id: string })[] = [];
    for (const attr of attributes) {
      items.push({ ...attr, _id: `attr:${attr.attribute.name}:${attr.parentEntityId ?? 'orphan'}` });
    }
    for (const ent of entities) {
      items.push({ ...ent, _id: `ent:${ent.entityId}` });
    }
    return items;
  }, [attributes, entities, drillEntity]);

  // Close on outside click (checks both input container AND portaled dropdown)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) {
        closeOmnibar();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────
  const closeOmnibar = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setHighlightIndex(-1);
    setDrillEntity(null);
    setSelectedAttrs(new Set());
  }, []);

  // Stay open but reset query — for rapid continuous input
  const resetForNextInput = useCallback(() => {
    setQuery('');
    setHighlightIndex(-1);
    setDrillEntity(null);
    setSelectedAttrs(new Set());
    inputRef.current?.focus();
  }, []);

  const handleSelectAttribute = useCallback((attr: SearchableAttribute) => {
    // Check if already added
    if (existingFields.some(f => f.definitionId === attr.parentEntityId && f.attributeKey === attr.attribute.name)) {
      return;
    }
    const newField: Field = {
      name: attr.attribute.name,
      type: attr.attribute.type,
      required: true,
      definitionId: attr.parentEntityId ?? undefined,
      attributeKey: attr.attribute.name,
      role: isScreen ? (availableFields.includes(attr.attribute.name) ? 'display' : 'input') : undefined
    };
    onAddFields([newField]);
    resetForNextInput();
  }, [existingFields, onAddFields, resetForNextInput, isScreen, availableFields]);

  const handleSelectEntity = useCallback((entity: SearchableEntity) => {
    // Transition to drill-down mode
    setDrillEntity(entity);
    setQuery('');
    setHighlightIndex(-1);

    // Pre-select attributes not already added
    const attrs = Array.isArray(entity.definition.attributes) ? entity.definition.attributes : [];
    const toSelect = attrs
      .filter(a => !existingFields.some(f => f.definitionId === entity.entityId && f.attributeKey === a.name))
      .map(a => a.name);
    setSelectedAttrs(new Set(toSelect));
  }, [existingFields]);

  const handleImportSelected = useCallback(() => {
    if (!drillEntity || !drillEntity.definition.attributes) return;
    const attrs = drillEntity.definition.attributes.filter(a => selectedAttrs.has(a.name));
    const newFields: Field[] = attrs.map(attr => ({
      name: attr.name,
      type: attr.type,
      required: true,
      definitionId: drillEntity.entityId,
      attributeKey: attr.name,
      role: isScreen ? (availableFields.includes(attr.name) ? 'display' : 'input') : undefined
    }));
    onAddFields(newFields);
    resetForNextInput();
  }, [drillEntity, selectedAttrs, onAddFields, resetForNextInput, isScreen, availableFields]);

  const handleCreateOrphan = useCallback(() => {
    const name = query.trim();
    if (!name) return;

    const newId = onCreateOrphan(name);
    const newField: Field = {
      name,
      type: 'String',
      required: true,
      definitionId: newId,
      attributeKey: name,
      role: isScreen ? (availableFields.includes(name) ? 'display' : 'input') : undefined
    };
    onAddFields([newField]);
    resetForNextInput();
  }, [query, onCreateOrphan, onAddFields, resetForNextInput, isScreen, availableFields]);

  const toggleAttr = useCallback((name: string) => {
    setSelectedAttrs(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // ─── Show "Create" fallback? ─────────────────────────────────────
  const showCreateFallback = query.trim().length > 0 && flatOptions.length === 0;

  // ─── Keyboard navigation ────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (drillEntity) {
      if (e.key === 'Escape') {
        setDrillEntity(null);
        setSelectedAttrs(new Set());
      } else if (e.key === 'Enter') {
        handleImportSelected();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => (prev < flatOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => (prev > 0 ? prev - 1 : flatOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < flatOptions.length) {
        const item = flatOptions[highlightIndex];
        if (item.kind === 'attribute') handleSelectAttribute(item as SearchableAttribute);
        else handleSelectEntity(item as SearchableEntity);
      } else if (showCreateFallback) {
        handleCreateOrphan();
      }
    } else if (e.key === 'Escape') {
      closeOmnibar();
    }
  };

  // Scroll highlighted into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-omni-item]');
    items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  // ─── Portal position tracking ────────────────────────────────────
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isOpen || !inputRef.current) return;
    const updatePosition = () => {
      const rect = inputRef.current!.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    };
    updatePosition();
    // Recalculate on scroll/resize (sidebar might scroll)
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Input */}
      <div className="relative">
        <div className="absolute inset-y-0 start-0 flex items-center pointer-events-none z-20 ps-3 text-gray-400 dark:text-neutral-500">
          <Search size={14} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setHighlightIndex(-1);
            if (!isOpen) setIsOpen(true);
            if (drillEntity) {
              setDrillEntity(null);
              setSelectedAttrs(new Set());
            }
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('omnibar.placeholder')}
          autoComplete="off"
          className="py-2 ps-8 pe-3 block w-full border-gray-200 rounded-lg text-xs focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
        />
      </div>

      {/* Portal Dropdown — rendered at document.body to escape overflow:hidden */}
      {isOpen && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-white border border-gray-200 shadow-lg rounded-xl dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70 p-1 origin-top">
            <div
              ref={listRef}
              className="max-h-60 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
            >
              {/* ─── Drill-Down Mode ───────────────────────────── */}
              {drillEntity ? (
                <DrillDownView
                  entity={drillEntity}
                  selectedAttrs={selectedAttrs}
                  existingFields={existingFields}
                  onToggle={toggleAttr}
                  onImport={handleImportSelected}
                  onBack={() => { setDrillEntity(null); setSelectedAttrs(new Set()); }}
                />
              ) : (
                <>
                  {/* ─── Attributes Section ──────────────────── */}
                  {attributes.length > 0 && (
                    <div>
                      <div className="px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider dark:text-neutral-400">
                        {t('omnibar.attributes')}
                      </div>
                      {attributes.map((attr, idx) => {
                        const isAdded = existingFields.some(
                          f => f.definitionId === attr.parentEntityId && f.attributeKey === attr.attribute.name
                        );
                        const itemIndex = idx;
                        return (
                          <button
                            key={`attr-${attr.attribute.name}-${attr.parentEntityId ?? 'orphan'}`}
                            data-omni-item
                            type="button"
                            disabled={isAdded}
                            onClick={() => !isAdded && handleSelectAttribute(attr)}
                            className={`w-full text-left py-1.5 px-3 rounded-lg flex items-center gap-2 text-xs transition-colors ${
                              isAdded
                                ? 'opacity-30 cursor-not-allowed'
                                : highlightIndex === itemIndex
                                  ? 'bg-blue-50 dark:bg-blue-800/30'
                                  : 'hover:bg-gray-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getTypeColor(attr.entityType)}`} />
                            <span className="font-mono font-medium text-gray-800 dark:text-neutral-200 truncate">
                              {attr.attribute.name}
                            </span>
                            {attr.parentName ? (
                              <span className="text-[10px] text-gray-400 dark:text-neutral-500 ml-auto flex-shrink-0">
                                in {attr.parentName}
                              </span>
                            ) : (
                              <span className="text-[10px] text-purple-400 dark:text-purple-500 ml-auto flex-shrink-0 italic">
                                orphan
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                   {/* ─── Definitions Section ────────────────── */}
                   {entities.length > 0 && (
                     <div>
                       <div className="px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider dark:text-neutral-400 mt-1">
                         {t('omnibar.definitions')}
                       </div>
                      {entities.map((ent, idx) => {
                        const itemIndex = attributes.length + idx;
                        const attrCount = Array.isArray(ent.definition.attributes) ? ent.definition.attributes.length : 0;
                        return (
                          <button
                            key={`ent-${ent.entityId}`}
                            data-omni-item
                            type="button"
                            onClick={() => handleSelectEntity(ent)}
                            className={`w-full text-left py-1.5 px-3 rounded-lg flex items-center gap-2 text-xs transition-colors ${
                              highlightIndex === itemIndex
                                ? 'bg-blue-50 dark:bg-blue-800/30'
                                : 'hover:bg-gray-100 dark:hover:bg-neutral-800'
                            }`}
                          >
                             <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getTypeColor(ent.entityType)}`} />
                             <span className="font-medium text-gray-800 dark:text-neutral-200 truncate">
                               {ent.name}
                             </span>
                             <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                               <span className={`text-[9px] font-bold px-1 rounded ${getTypeColor(ent.entityType)} text-white opacity-80 uppercase`}>
                                 {ent.entityType.substring(0, 3)}
                               </span>
                               <span className="text-[10px] text-gray-400 dark:text-neutral-500">
                                 {attrCount} {t('omnibar.field', { count: attrCount })}
                               </span>
                               <ArrowRight size={12} className="text-gray-300 dark:text-neutral-600" />
                             </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ─── Create Orphan Fallback ──────────────── */}
                  {showCreateFallback && (
                    <div className="pt-1 mt-1 border-t border-gray-200 dark:border-neutral-700">
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-neutral-800">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('common.suggestions')}</h4>
                      </div>
                      <button
                        type="button"
                        data-omni-item
                        onClick={handleCreateOrphan}
                        className="w-full text-left py-2 px-3 rounded-lg flex items-center gap-2 text-xs text-blue-600 font-medium hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-800/30 transition-colors"
                      >
                        <Plus size={14} />
                        {t('omnibar.create', { name: query.trim() })}
                      </button>
                    </div>
                  )}

                  {/* ─── Empty Hint ──────────────────────────── */}
                  {!showCreateFallback && flatOptions.length === 0 && !query.trim() && (
                    <div className="p-3 text-center text-xs text-gray-400 dark:text-neutral-500 italic">
                      {t('omnibar.emptyHint')}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ─── Drill-Down Sub-Component ────────────────────────────────────────
interface DrillDownViewProps {
  entity: SearchableEntity;
  selectedAttrs: Set<string>;
  existingFields: Field[];
  onToggle: (name: string) => void;
  onImport: () => void;
  onBack: () => void;
}

const DrillDownView: React.FC<DrillDownViewProps> = ({
  entity,
  selectedAttrs,
  existingFields,
  onToggle,
  onImport,
  onBack,
}) => {
  const { t } = useTranslation();
  const attrs = Array.isArray(entity.definition.attributes) ? entity.definition.attributes : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-neutral-700">
        <button
          type="button"
          onClick={onBack}
          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <div className={`w-2 h-2 rounded-full ${getTypeColor(entity.entityType)}`} />
        <span className="text-xs font-bold text-gray-800 dark:text-neutral-200">{entity.name}</span>
        <span className="text-[10px] text-gray-400 uppercase">{entity.entityType}</span>
      </div>

      {/* Attribute List */}
      <div className="flex flex-col gap-0.5 p-1 max-h-[180px] overflow-y-auto">
        {attrs.map(attr => {
          const isAlreadyAdded = existingFields.some(
            f => f.definitionId === entity.entityId && f.attributeKey === attr.name
          );
          const isSelected = selectedAttrs.has(attr.name);

          return (
            <button
              key={attr.name}
              type="button"
              onClick={() => !isAlreadyAdded && onToggle(attr.name)}
              disabled={isAlreadyAdded}
              className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                isAlreadyAdded
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-gray-100 dark:hover:bg-neutral-800'
              }`}
            >
              {isAlreadyAdded || isSelected
                ? <CheckSquare size={13} className={isAlreadyAdded ? 'text-gray-400' : 'text-blue-500'} />
                : <Square size={13} className="text-gray-300 dark:text-neutral-600" />
              }
              <span className="font-mono text-[11px] flex-1 text-gray-700 dark:text-neutral-300">{attr.name}</span>
              <span className="text-[9px] text-gray-400 uppercase">{attr.type}</span>
            </button>
          );
        })}
        {attrs.length === 0 && (
          <p className="text-xs text-gray-400 italic p-2 text-center">{t('omnibar.noAttributes')}</p>
        )}
      </div>

      {/* Import Button */}
      {attrs.length > 0 && (
        <div className="px-2 py-1.5 border-t border-gray-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={onImport}
            disabled={selectedAttrs.size === 0}
            className="w-full py-1.5 px-3 inline-flex items-center justify-center gap-x-2 text-[11px] font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm"
          >
            {t('omnibar.import', { count: selectedAttrs.size })}
          </button>
        </div>
      )}
    </div>
  );
};
