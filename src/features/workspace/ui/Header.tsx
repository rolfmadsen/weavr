import React, { useState, useEffect } from 'react';
import {
  Wand2,
  Menu,
  Undo,
  Redo,
  Edit,
  Share2,
  PinOff
} from 'lucide-react';
import clsx from 'clsx';
import * as Tooltip from '@radix-ui/react-tooltip';
import { AppMenu } from './AppMenu';

interface HeaderProps {
  onOpen: (file: File) => void;
  onMerge: (file: File) => void;
  onExport: () => void;
  onStandardExport?: () => void;
  onOpenHelp: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAutoLayout: () => void;
  onUnpinAll: () => void;
  onOpenModelList: () => void;
  currentModelName: string;
  onRenameModel: (newName: string) => void;
  onGenerateDocs: () => void;
  onShare: () => void;
  hasPinnedNodes?: boolean;
}

const IconButton = ({ onClick, disabled, children, title, color = 'neutral' }: any) => (
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={clsx(
            "p-2 rounded-full transition-all duration-200",
            disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-black/5 dark:hover:bg-white/10 active:scale-95",
            color === 'error' && !disabled ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" : "text-slate-600 dark:text-slate-300"
          )}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="z-50 px-2 py-1 text-xs font-medium text-white bg-slate-900 rounded shadow-lg animate-in fade-in zoom-in-95 duration-200" sideOffset={5}>
          {title}
          <Tooltip.Arrow className="fill-slate-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);

const Header: React.FC<HeaderProps> = ({
  onOpen,
  onMerge,
  onExport,
  onStandardExport,
  onOpenHelp,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAutoLayout,
  onUnpinAll,
  onOpenModelList,
  currentModelName,
  onRenameModel,
  onGenerateDocs,
  onShare,
  hasPinnedNodes = false
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(currentModelName);

  // Update tempName when currentModelName changes externally (e.g. file load)
  useEffect(() => {
    setTempName(currentModelName);
  }, [currentModelName]);

  const handleShareClick = () => {
    const cleanOrigin = window.location.origin.startsWith('blob:') ? window.location.origin.substring(5) : window.location.origin;
    const shareUrl = `${cleanOrigin}${window.location.hash}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    onShare();
  };

  const handleNameSubmit = () => {
    if (tempName.trim()) onRenameModel(tempName.trim());
    else setTempName(currentModelName);
    setIsEditingName(false);
  };

  return (
    <nav className="relative h-16 shrink-0 z-40 px-4 flex items-center justify-between border-b 
      bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl 
      border-white/20 dark:border-white/5 text-slate-800 dark:text-slate-100 transition-colors duration-500">

      {/* Left: Logo & Model Name */}
      <div className="flex items-center gap-3 min-w-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/weavr_icon.svg" alt="Weavr Logo" className="w-10 h-10" />
        </div>

        {/* Model Name / Edit */}
        {isEditingName ? (
          <input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            autoFocus
            className="bg-transparent border-b-2 border-purple-500 outline-none text-lg font-bold w-[200px] sm:w-[300px] px-1 py-0.5"
          />
        ) : (
          <div
            onClick={() => { setTempName(currentModelName); setIsEditingName(true); }}
            className="group flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <span className="text-lg font-bold truncate max-w-[200px] sm:max-w-[400px]">{currentModelName}</span>
            <Edit className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors w-4 h-4 ml-2" size={16} />
          </div>
        )}
      </div>

      {/* Right: Canvas Tools & Share & Menu */}
      <div className="flex items-center gap-3 z-50">

        {/* Desktop Tools */}
        <div className="hidden md:flex items-center gap-3">
          {/* Undo / Redo */}
          <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-full p-0.5">
            <IconButton onClick={onUndo} disabled={!canUndo} title="Undo"><Undo size={16} /></IconButton>
            <IconButton onClick={onRedo} disabled={!canRedo} title="Redo"><Redo size={16} /></IconButton>
          </div>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

          {/* Layout Tools */}
          <div className="flex items-center gap-1">
            <IconButton onClick={onAutoLayout} title="Auto Layout"><Wand2 size={16} className="text-purple-500" /></IconButton>
            <IconButton
              onClick={onUnpinAll}
              title={hasPinnedNodes ? "Unpin All" : "No nodes pinned"}
              color="error"
              disabled={!hasPinnedNodes}
            >
              <PinOff size={16} />
            </IconButton>
          </div>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>

          {/* Share */}
          <button
            onClick={handleShareClick}
            className={clsx(
              "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm border",
              copied
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : "bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-700/80 border-white/20 dark:border-white/10"
            )}
          >
            {copied ? 'Copied!' : <><Share2 size={16} /> Share</>}
          </button>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1"></div>
        </div>

        {/* Hamburger Menu (AppMenu) */}
        <AppMenu
          onOpenModelList={onOpenModelList}
          onOpen={onOpen}
          onMerge={onMerge}
          onExport={onExport}
          onStandardExport={onStandardExport}
          onGenerateDocs={onGenerateDocs}
          onOpenHelp={onOpenHelp}
          trigger={
            <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-slate-300 outline-none">
              <Menu size={24} />
            </button>
          }
        />
      </div>
    </nav>
  );
};

export default Header;