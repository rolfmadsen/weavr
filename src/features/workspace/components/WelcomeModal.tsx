import React from 'react';
import { ElementType } from '../../modeling';
import { ELEMENT_STYLE } from '../../../shared/constants';
import {
  CloseIcon,
  ScreenIcon,
  CommandIcon,
  DomainEventIcon,
  ReadModelIcon,
  IntegrationEventIcon,
  AutomationIcon
} from '../../../shared/components/icons';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ELEMENT_MAP: Record<ElementType, { name: string; icon: React.ReactNode }> = {
  [ElementType.Screen]: { name: 'User Interface', icon: <ScreenIcon /> },
  [ElementType.Command]: { name: 'Command', icon: <CommandIcon /> },
  [ElementType.DomainEvent]: { name: 'Domain Event', icon: <DomainEventIcon /> },
  [ElementType.ReadModel]: { name: 'Read Model', icon: <ReadModelIcon /> },
  [ElementType.IntegrationEvent]: { name: 'Integration Event', icon: <IntegrationEventIcon /> },
  [ElementType.Automation]: { name: 'Automation', icon: <AutomationIcon /> },
};

// Accessible text colors for white background (WCAG AA compliant)
// Accessible text colors for white background (WCAG AA compliant)
const ACCESSIBLE_TEXT_COLORS: Record<ElementType, string> = {
  [ElementType.Screen]: '#374151', // gray-700
  [ElementType.Command]: '#1d4ed8', // blue-700 (vs #2563eb blue-600)
  [ElementType.DomainEvent]: '#c2410c', // orange-700 (vs #ea580c orange-600)
  [ElementType.ReadModel]: '#15803d', // green-700 (vs #16a34a green-600)
  [ElementType.IntegrationEvent]: '#a16207', // yellow-700
  [ElementType.Automation]: '#0f766e', // teal-700 (vs #0d9488 teal-600)
};

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Welcome to Weavr!</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-200">
            <CloseIcon />
          </button>
        </div>

        <div className="p-6 overflow-y-auto text-gray-700 space-y-6">
          <p className="text-base">
            This is your canvas for <strong className="font-semibold text-indigo-600">Event Modeling</strong>, a visual way to design systems by focusing on how information changes over time.
          </p>

          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3">Core Elements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {Object.values(ElementType).map(type => (
                <div key={type} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: ELEMENT_STYLE[type].color, color: ELEMENT_STYLE[type].textColor }}
                  >
                    {ELEMENT_MAP[type].icon}
                  </div>
                  <span className="font-medium text-gray-700">{ELEMENT_MAP[type].name}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Getting Started (The Workflow)</h3>
            <ol className="list-decimal list-inside space-y-3 text-gray-600">
              <li>
                <strong>Model the Core User Flow:</strong> Start with the user's perspective. An action begins on a <span className="font-semibold text-gray-800">User Interface</span>, which triggers a <span className="font-semibold" style={{ color: ACCESSIBLE_TEXT_COLORS[ElementType.Command] }}>Command</span> (the intent). A successful command creates a <span className="font-semibold" style={{ color: ACCESSIBLE_TEXT_COLORS[ElementType.DomainEvent] }}>Domain Event</span> (the fact). This event then updates a <span className="font-semibold" style={{ color: ACCESSIBLE_TEXT_COLORS[ElementType.ReadModel] }}>Read Model</span>, providing feedback to the user on a <span className="font-semibold text-gray-800">User Interface</span>.
              </li>
              <li>
                <strong>Add System Reactions:</strong> Does an Event trigger an automatic process? Use an <span className="font-semibold" style={{ color: ACCESSIBLE_TEXT_COLORS[ElementType.Automation] }}>Automation</span> element. It listens for an event and issues a new command.
              </li>
              <li>
                <strong>Integrate External Systems:</strong> When data enters your system from an outside source, use an <span className="font-semibold" style={{ color: ACCESSIBLE_TEXT_COLORS[ElementType.IntegrationEvent] }}>Integration Event</span>. It can either update a Read Model directly or trigger an Automation to translate it into an internal command.
              </li>
            </ol>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
          <h3 className="text-lg font-bold text-amber-800 mb-2 flex items-center gap-2">
            ⚠️ Important: Data Storage
          </h3>
          <p className="text-amber-800 text-sm mb-2">
            Weavr stores your models directly in your <strong>browser's internal database</strong>.
            We do not store your data on any cloud server.
          </p>
          <p className="text-amber-900 text-sm font-bold">
            If you clear your browser cache or site data, your models will be permanently deleted.
          </p>
          <p className="text-amber-800 text-sm mt-2">
            Please use the <strong>Export</strong> feature frequently to save backup copies to your device.
          </p>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl text-right">
          <button
            onClick={onClose}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Start Modeling
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;