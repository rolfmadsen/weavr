import React from 'react';

const MaterialIcon: React.FC<{ icon: string; className?: string }> = ({ icon, className }) => (
    <span className={`material-symbols-outlined ${className}`}>{icon}</span>
);

export const CommandIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="dynamic_form" className={className} />;
export const DomainEventIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="flash_on" className={className} />;
export const ReadModelIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="visibility" className={className} />;
export const ScreenIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="desktop_windows" className={className} />;
export const IntegrationEventIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="public" className={className} />;
export const AutomationIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="settings" className={className} />;

export const AddIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="add" className={className} />;
export const CloseIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="close" className={className} />;
export const DeleteIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="delete" className={className} />;
export const ExportIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="download" className={className} />;
export const ImportIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="upload" className={className} />;
export const ViewColumnIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="view_column" className={className} />;
export const HelpIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="help_outline" className={className} />;
export const MagicWandIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="auto_fix_high" className={className} />;
export const PlusIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="add" className={className} />;
export const CheckIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="check" className={className} />;
export const EditIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="edit" className={className} />;
export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="expand_more" className={className} />;
export const MenuIcon: React.FC<{ className?: string }> = ({ className }) => <MaterialIcon icon="menu" className={className} />;