import React from 'react';
import { Info } from 'lucide-react';
import { ElementType } from '../../modeling';

const ELEMENT_DESCRIPTIONS: Partial<Record<ElementType, { title: string; purpose: string; story: string; tech: string }>> = {
    [ElementType.Screen]: {
        title: 'User Interface / Screen',
        purpose: 'Visualizes the current state for the user.',
        story: 'The "Scene". It displays information derived from past events (via Projections) and offers controls to trigger new actions (Commands).',
        tech: 'Presentation Layer. The "Where" of the interaction.'
    },
    [ElementType.Command]: {
        title: 'Command',
        purpose: 'An intent to change the system state.',
        story: 'The "Attempt". You are asking the system to do something. Before saying "Yes", the system builds a Decision Model to check if this is allowed.',
        tech: 'Input / Request. Targeting specific Tags (Consistency Boundary) to validate Invariants.'
    },
    [ElementType.DomainEvent]: {
        title: 'Domain Event',
        purpose: 'A fact that definitely happened.',
        story: 'The "History". If this exists, it means the Command was accepted and all business rules (Decision Model) passed. It cannot be rejected or changed later.',
        tech: 'Immutable Fact. The basis for all State (Projections).'
    },
    [ElementType.ReadModel]: {
        title: 'Read Model / Projection',
        purpose: 'Translates event history into useful state.',
        story: 'The "Translation". Events are just a list of what happened. This component translates that raw list into a specific shape—either for the UI (Read Model) or to check rules (Decision Model).',
        tech: 'Projection (f(state, event) => state). Derived Data.'
    },
    [ElementType.IntegrationEvent]: {
        title: 'Integration Event',
        purpose: 'Connecting with the outside world.',
        story: 'A signal, typically a message with an id, that something happened in another boundary (like a Payment Provider) that we need to react to.',
        tech: 'External / Public Event. Cross-Context communication.'
    },
    [ElementType.Automation]: {
        title: 'Automation',
        purpose: 'System-triggered actions.',
        story: 'The "Robot". It watches for specific Events (facts) and automatically triggers a new Command (intent) to keep a process moving.',
        tech: 'Process Manager. Side-effect trigger.'
    }
};

export const ElementHelp: React.FC<{ type: ElementType }> = ({ type }) => {
    const info = ELEMENT_DESCRIPTIONS[type];
    if (!info) return null;

    return (
        <div className="mt-4 p-4 bg-purple-50 dark:bg-black/20 rounded-xl border border-purple-100 dark:border-white/10 text-sm">
            <div className="flex gap-2 items-center mb-3 text-purple-600 dark:text-purple-400">
                <Info size={16} />
                <span className="font-bold">{info.title}</span>
            </div>

            <div className="mb-3">
                <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1">Role</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{info.purpose}</p>
            </div>

            <div className="mb-3">
                <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1">The Story</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{info.story}</p>
            </div>

            <div>
                <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1">Technical Meaning</span>
                <code className="text-xs bg-slate-200 dark:bg-black/40 px-1 py-0.5 rounded text-purple-700 dark:text-purple-300 block w-full overflow-x-auto">{info.tech}</code>
            </div>
        </div>
    );
};
