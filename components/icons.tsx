import React from 'react';

const MaterialIcon: React.FC<{ icon: string; className?: string }> = ({ icon, className }) => (
    <span className={`material-symbols-outlined ${className}`}>{icon}</span>
);

export const CommandIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="dynamic_form" className={className} />;
export const EventInternalIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="flash_on" className={className} />;
export const ReadModelIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="visibility" className={className} />;
export const ScreenIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="desktop_windows" className={className} />;
export const EventExternalIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="public" className={className} />;

export const AddIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="add" className={className} />;
export const CloseIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="close" className={className} />;
export const DeleteIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="delete" className={className} />;
export const ExportIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="download" className={className} />;
export const ImportIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="upload" className={className} />;
export const ViewColumnIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="view_column" className={className} />;