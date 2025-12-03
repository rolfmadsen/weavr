import React from 'react';
import { ElementType } from '../../modeling';
import { ELEMENT_STYLE } from '../../../shared/constants';
import {
  CloseIcon,
  ScreenIcon,
  CommandIcon,
  EventInternalIcon,
  ReadModelIcon,
  EventExternalIcon,
  AutomationIcon
} from '../../../shared/components/icons';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ELEMENT_MAP: Record<ElementType, { name: string; icon: React.ReactNode }> = {
  [ElementType.Screen]: { name: 'User Interface', icon: <ScreenIcon /> },
  [ElementType.Command]: { name: 'Command', icon: <CommandIcon /> },
  [ElementType.EventInternal]: { name: 'Internal Event', icon: <EventInternalIcon /> },
  [ElementType.ReadModel]: { name: 'Read Model', icon: <ReadModelIcon /> },
  [ElementType.EventExternal]: { name: 'External Event', icon: <EventExternalIcon /> },
  [ElementType.Automation]: { name: 'Automation', icon: <AutomationIcon /> },
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
                <strong>Model the Core User Flow:</strong> Start with the user's perspective. An action begins on a <span className="font-semibold text-gray-800">User Interface</span>, which triggers a <span className="font-semibold" style={{ color: ELEMENT_STYLE.COMMAND.color }}>Command</span> (the intent). A successful command creates an <span className="font-semibold" style={{ color: ELEMENT_STYLE.EVENT_INTERNAL.color }}>Internal Event</span> (the fact). This event then updates a <span className="font-semibold" style={{ color: ELEMENT_STYLE.READ_MODEL.color }}>Read Model</span>, providing feedback to the user on a <span className="font-semibold text-gray-800">User Interface</span>.
              </li>
              <li>
                <strong>Add System Reactions:</strong> Does an Event trigger an automatic process? Use an <span className="font-semibold" style={{ color: ELEMENT_STYLE.AUTOMATION.color }}>Automation</span> element. It listens for an event and issues a new command.
              </li>
              <li>
                <strong>Integrate External Systems:</strong> When data enters your system from an outside source, use an <span className="font-semibold" style={{ color: ELEMENT_STYLE.EVENT_EXTERNAL.textColor }}>External Event</span>. It can either update a Read Model directly or trigger an Automation to translate it into an internal command.
              </li>
            </ol>
          </div>
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