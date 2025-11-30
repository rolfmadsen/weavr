import React, { useRef, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Upload as ImportIcon,
  Download as ExportIcon,
  Help as HelpIcon,
  AutoFixHigh as MagicWandIcon,
  Menu as MenuIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Folder as FolderIcon
} from '@mui/icons-material';

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
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(currentModelName);

  // Mobile menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
    handleMenuClose();
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
    handleMenuClose();
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
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
        {/* Left Section: Logo & Model Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Weavr
          </Typography>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Button
              startIcon={<FolderIcon />}
              onClick={onOpenModelList}
              size="small"
              sx={{ display: { xs: 'none', sm: 'flex' }, whiteSpace: 'nowrap' }}
            >
              My Models
            </Button>

            {isEditingName ? (
              <TextField
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleKeyDown}
                autoFocus
                size="small"
                variant="outlined"
                sx={{ width: 200 }}
                inputProps={{ style: { padding: '4px 8px' } }}
              />
            ) : (
              <Box
                onClick={startEditing}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  '&:hover .edit-icon': { opacity: 1 }
                }}
              >
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 500, maxWidth: { xs: 150, sm: 250 } }}>
                  {currentModelName}
                </Typography>
                <EditIcon className="edit-icon" sx={{ fontSize: 16, opacity: 0, transition: 'opacity 0.2s', color: 'text.secondary' }} />
              </Box>
            )}
          </Box>
        </Box>

        {/* Desktop Toolbar */}
        {!isMobile ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              color={copied ? "success" : "primary"}
              onClick={handleShareClick}
              size="small"
              startIcon={!copied && <ShareIcon />}
              sx={{ borderRadius: 20 }}
            >
              {copied ? 'Copied!' : 'Share'}
            </Button>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

            <Box sx={{ bgcolor: 'action.hover', borderRadius: 20, p: 0.5 }}>
              <Tooltip title="Undo (Ctrl+Z)">
                <span>
                  <IconButton onClick={onUndo} disabled={!canUndo} size="small">
                    <UndoIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Redo (Ctrl+Y)">
                <span>
                  <IconButton onClick={onRedo} disabled={!canRedo} size="small">
                    <RedoIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

            <Tooltip title="Auto Layout">
              <Button
                onClick={onAutoLayout}
                color="secondary"
                startIcon={<MagicWandIcon />}
                size="small"
              >
                Auto Layout
              </Button>
            </Tooltip>

            <Tooltip title="Help">
              <IconButton onClick={onOpenHelp}>
                <HelpIcon />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

            <Tooltip title="Import/Export">
              <IconButton onClick={handleMenuOpen}>
                <ExportIcon />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={isMenuOpen}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={onExport}>
                <ExportIcon sx={{ mr: 1 }} /> Export JSON
              </MenuItem>
              <MenuItem onClick={handleImportClick}>
                <ImportIcon sx={{ mr: 1 }} /> Import JSON
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <>
            <IconButton onClick={handleMenuOpen}>
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={isMenuOpen}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => { onOpenModelList(); handleMenuClose(); }}>
                <FolderIcon sx={{ mr: 1 }} /> My Models
              </MenuItem>
              <MenuItem onClick={handleShareClick}>
                <ShareIcon sx={{ mr: 1 }} /> Share Link
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { onUndo(); handleMenuClose(); }} disabled={!canUndo}>
                <UndoIcon sx={{ mr: 1 }} /> Undo
              </MenuItem>
              <MenuItem onClick={() => { onRedo(); handleMenuClose(); }} disabled={!canRedo}>
                <RedoIcon sx={{ mr: 1 }} /> Redo
              </MenuItem>
              <MenuItem onClick={() => { onAutoLayout(); handleMenuClose(); }}>
                <MagicWandIcon sx={{ mr: 1 }} /> Auto Layout
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { onExport(); handleMenuClose(); }}>
                <ExportIcon sx={{ mr: 1 }} /> Export JSON
              </MenuItem>
              <MenuItem onClick={handleImportClick}>
                <ImportIcon sx={{ mr: 1 }} /> Import JSON
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => { onOpenHelp(); handleMenuClose(); }}>
                <HelpIcon sx={{ mr: 1 }} /> Help
              </MenuItem>
            </Menu>
          </>
        )}

        <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" style={{ display: 'none' }} />
      </Toolbar>
    </AppBar>
  );
};

export default Header;