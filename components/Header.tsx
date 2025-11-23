import React, { useRef, useState } from 'react';
import { ExportIcon, ImportIcon, ViewColumnIcon, HelpIcon, MagicWandIcon } from './icons';

interface HeaderProps {
  onImport: (file: File) => void;
  onExport: () => void;
  onToggleSlices: () => void;
  slicesVisible: boolean;
  onOpenHelp: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAutoLayout: () => void;
  isAutoLayoutDisabled?: boolean;
  onToggleExperimentalLayout: () => void; // Added prop
  experimentalLayoutEnabled: boolean; // Added prop
}

const Header: React.FC<HeaderProps> = ({
  onImport,
  onExport,
  onToggleSlices,
  slicesVisible,
  onOpenHelp,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAutoLayout,
  isAutoLayoutDisabled = false,
  onToggleExperimentalLayout,
  experimentalLayoutEnabled
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const handleImportClick = () => {
    fileInputRef.current?.click();
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
  };

  return (
    <header className="absolute top-0 left-0 right-0 px-2 md:px-6 py-2 flex justify-between items-center z-10 bg-white shadow-md">
      <a href="/" title="Start a new model">
        <h1 className="text-lg md:text-xl font-bold text-gray-800 select-none truncate hover:text-indigo-600 transition-colors duration-200">
          Weavr - Event Modelling
        </h1>
      </a>

      <div className="flex items-center gap-1 md:gap-2">
        <button
          onClick={handleShareClick}
          className="bg-indigo-600 text-white px-3 py-2 md:px-4 rounded-full hover:bg-indigo-700 transition-all duration-200 text-sm"
          title="Copy link to share"
        >
          {copied ? 'Copied!' : 'Share'}
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1 md:mx-2"></div>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-full transition-colors duration-200 flex items-center ${canUndo ? 'text-gray-700 hover:bg-gray-200 hover:text-gray-900' : 'text-gray-300 cursor-not-allowed'}`}
          title="Undo (Ctrl+Z)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded-full transition-colors duration-200 flex items-center ${canRedo ? 'text-gray-700 hover:bg-gray-200 hover:text-gray-900' : 'text-gray-300 cursor-not-allowed'}`}
          title="Redo (Ctrl+Y)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></svg>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1 md:mx-2"></div>

        <button
          onClick={onOpenHelp}
          className="text-gray-500 p-2 rounded-full hover:bg-gray-200 hover:text-gray-800 transition-colors duration-200 flex items-center"
          title="Help"
        >
          <HelpIcon className="text-xl" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1 md:mx-2"></div>

        {/* Auto Layout Button */}
        <button
          onClick={onAutoLayout}
          disabled={isAutoLayoutDisabled}
          className={`${isAutoLayoutDisabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'} p-2 md:px-4 md:py-2 rounded-full transition-all duration-200 flex items-center gap-2`}
          title={isAutoLayoutDisabled ? "Auto Layout disabled in Slice view" : "Auto-Layout (ELK)"}
        >
          <MagicWandIcon className="text-xl" />
          <span className="hidden md:inline">Auto Layout</span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1 md:mx-2"></div>

        <div className="flex items-center bg-gray-100 rounded-full p-1">
          <button
            onClick={onToggleSlices}
            className={`${slicesVisible ? 'bg-indigo-200 text-indigo-800 shadow-sm' : 'text-gray-600 hover:bg-gray-200'} p-2 md:px-4 md:py-2 rounded-full transition-all duration-200 flex items-center gap-2`}
            title={slicesVisible ? 'Hide Slices' : 'Show Slices'}
          >
            <ViewColumnIcon className="text-xl" />
            <span className="hidden md:inline">Slices</span>
          </button>

          {slicesVisible && (
            <button
              onClick={onToggleExperimentalLayout}
              className={`${experimentalLayoutEnabled ? 'bg-green-200 text-green-800 shadow-sm' : 'text-gray-600 hover:bg-gray-200'} p-2 md:px-3 md:py-2 rounded-full transition-all duration-200 flex items-center gap-2 ml-1`}
              title="Toggle Experimental Zoned Layout"
            >
              {/* Beaker Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 3h15" /><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3" /><path d="M6 14h12" /></svg>
            </button>
          )}
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1 md:mx-2"></div>

        <button
          onClick={onExport}
          className="bg-gray-200 text-gray-700 p-2 md:px-4 md:py-2 rounded-full hover:bg-gray-300 transition-all duration-200 flex items-center gap-2"
          title="Export Model as JSON"
        >
          <ExportIcon className="text-xl" />
          <span className="hidden md:inline">Export</span>
        </button>
        <button
          onClick={handleImportClick}
          className="bg-gray-200 text-gray-700 p-2 md:px-4 md:py-2 rounded-full hover:bg-gray-300 transition-all duration-200 flex items-center gap-2"
          title="Import Model from JSON"
        >
          <ImportIcon className="text-xl" />
          <span className="hidden md:inline">Import</span>
        </button>
        <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      </div>
    </header>
  );
};

export default Header;