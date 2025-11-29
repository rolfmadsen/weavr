import React, { useRef, useState } from 'react';
import { ExportIcon, ImportIcon, HelpIcon, MagicWandIcon, MenuIcon, CloseIcon, EditIcon } from './icons';

interface HeaderProps {
  onImport: (file: File) => void;
  onExport: () => void;
  onOpenHelp: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAutoLayout: () => void;
  onOpenModelList: () => void;
  currentModelName: string;
  onRenameModel: (newName: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  onImport,
  onExport,
  onOpenHelp,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAutoLayout,
  onOpenModelList,
  currentModelName,
  onRenameModel
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(currentModelName);

  const handleImportClick = () => {
    fileInputRef.current?.click();
    setIsMenuOpen(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
    event.target.value = '';
  };

  const handleShareClick = () => {
    const cleanOrigin = window.location.origin.startsWith('blob:')
      ? window.location.origin.substring(5)
      : window.location.origin;

    const hash = window.location.hash;
    const shareUrl = `${cleanOrigin}${hash}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    setIsMenuOpen(false);
  };

  const handleNameSubmit = () => {
    if (tempName.trim()) {
      onRenameModel(tempName.trim());
    } else {
      setTempName(currentModelName);
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setTempName(currentModelName);
      setIsEditingName(false);
    }
  };

  const startEditing = () => {
    setTempName(currentModelName);
    setIsEditingName(true);
  };

  return (
    <header className="absolute top-0 left-0 right-0 px-4 py-2 flex justify-between items-center z-10 bg-white shadow-md h-14">
      {/* Left Section: Logo & Model Name */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <a href="/" title="Start a new model" className="shrink-0">
          <h1 className="text-xl font-bold text-gray-800 select-none hover:text-indigo-600 transition-colors duration-200">
            Weavr
          </h1>
        </a>

        <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>

        {/* Model Name & My Models */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenModelList}
            className="hidden sm:flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors whitespace-nowrap"
          >
            My Models
          </button>

          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            {isEditingName ? (
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleKeyDown}
                autoFocus
                className="px-2 py-1 text-sm font-medium border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full max-w-[200px]"
              />
            ) : (
              <div
                className="flex items-center gap-2 group cursor-pointer min-w-0"
                onClick={startEditing}
                title="Click to rename"
              >
                <span className="text-sm font-medium text-gray-700 truncate max-w-[150px] sm:max-w-[250px]">
                  {currentModelName}
                </span>
                <EditIcon className="text-gray-400 opacity-0 group-hover:opacity-100 w-4 h-4" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Toolbar */}
      <div className="hidden md:flex items-center gap-2">
        <button
          onClick={handleShareClick}
          className="bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-all duration-200 text-sm font-medium shadow-sm"
          title="Copy link to share"
        >
          {copied ? 'Copied!' : 'Share'}
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        <div className="flex items-center bg-gray-100 rounded-full p-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-full transition-colors ${canUndo ? 'text-gray-700 hover:bg-white hover:shadow-sm' : 'text-gray-300 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-full transition-colors ${canRedo ? 'text-gray-700 hover:bg-white hover:shadow-sm' : 'text-gray-300 cursor-not-allowed'}`}
            title="Redo (Ctrl+Y)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></svg>
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        <button
          onClick={onAutoLayout}
          className="text-gray-600 hover:text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
          title="Auto-Layout"
        >
          <MagicWandIcon className="text-lg" />
          <span>Auto Layout</span>
        </button>

        <button
          onClick={onOpenHelp}
          className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors"
          title="Help"
        >
          <HelpIcon className="text-xl" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        <div className="relative group">
          <button className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1">
            <span className="text-sm font-medium">File</span>
          </button>
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 hidden group-hover:block">
            <button onClick={onExport} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <ExportIcon className="text-lg" /> Export JSON
            </button>
            <button onClick={handleImportClick} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <ImportIcon className="text-lg" /> Import JSON
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMenuOpen(true)}
        className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
      >
        <MenuIcon className="text-2xl" />
      </button>

      {/* Mobile Menu Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-2xl p-4 flex flex-col gap-4 animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h2 className="font-bold text-lg text-gray-800">Menu</h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-1">
              <button onClick={() => { onOpenModelList(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 transition-colors">
                My Models
              </button>
              <button onClick={handleShareClick} className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors flex items-center justify-between">
                Share Link {copied && <span className="text-xs text-green-600 font-bold">Copied!</span>}
              </button>
            </div>

            <div className="h-px bg-gray-100 my-2"></div>

            <div className="space-y-1">
              <button onClick={() => { onUndo(); setIsMenuOpen(false); }} disabled={!canUndo} className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50">
                Undo
              </button>
              <button onClick={() => { onRedo(); setIsMenuOpen(false); }} disabled={!canRedo} className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50">
                Redo
              </button>
              <button onClick={() => { onAutoLayout(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-2">
                <MagicWandIcon /> Auto Layout
              </button>
            </div>

            <div className="h-px bg-gray-100 my-2"></div>

            <div className="space-y-1">
              <button onClick={() => { onExport(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-2">
                <ExportIcon /> Export JSON
              </button>
              <button onClick={handleImportClick} className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-2">
                <ImportIcon /> Import JSON
              </button>
            </div>

            <div className="mt-auto">
              <button onClick={() => { onOpenHelp(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-600 flex items-center gap-2">
                <HelpIcon /> Help & Controls
              </button>
            </div>
          </div>
        </div>
      )}

      <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
    </header>
  );
};

export default Header;