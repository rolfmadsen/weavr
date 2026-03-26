import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { ElementType } from '../../modeling';
import { ELEMENT_STYLE } from '../../../shared/constants';
import {
  Monitor,
  SquareActivity, // Replacing Command
  Zap,
  Eye,
  Globe,
  Settings,
  Upload,
  BookOpen,
  CheckSquare,
  Keyboard,
  BadgeAlert,
  Layers
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../shared/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../shared/components/ui/tabs";
import { Button } from "../../../shared/components/ui/button";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
}

const Kbd: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">{children}</kbd>
);

const IntroductionContent: React.FC<{ onLoadExample: () => void }> = ({ onLoadExample }) => {
  const { t } = useTranslation();

  const ELEMENT_MAP: Record<ElementType, { name: string; icon: React.ReactNode }> = {
    [ElementType.Screen]: { name: t('modeling.elements.screen'), icon: <Monitor size={20} /> },
    [ElementType.Command]: { name: t('modeling.elements.command'), icon: <SquareActivity size={20} /> },
    [ElementType.DomainEvent]: { name: t('modeling.elements.domainEvent'), icon: <Zap size={20} /> },
    [ElementType.ReadModel]: { name: t('modeling.elements.readModel'), icon: <Eye size={20} /> },
    [ElementType.IntegrationEvent]: { name: t('modeling.elements.integrationEvent'), icon: <Globe size={20} /> },
    [ElementType.Automation]: { name: t('modeling.elements.automation'), icon: <Settings size={20} /> },
  };

  return (
    <div className="space-y-6">
      <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100/50 dark:border-purple-500/10 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-purple-900 dark:text-purple-300">{t('help.newToEventModeling')}</h3>
          <p className="text-purple-700 dark:text-purple-400 text-sm mt-1">
            {t('help.loadExampleDescription')}
          </p>
        </div>
        <Button
          onClick={onLoadExample}
          className="shrink-0 flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-purple-500/20 border-none"
        >
          <Upload className="size-4" />
          {t('help.loadExampleButton')}
        </Button>
      </div>

      <p className="text-base text-slate-700 dark:text-slate-300">
        <strong className="font-semibold text-purple-600 dark:text-purple-400">{t('help.introContent.title')}</strong> {t('help.introContent.description')}
      </p>

      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{t('help.introContent.storage.title')}</h3>
        <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li>
              {t('help.introContent.storage.localFirst')}
            </li>
            <li>
              {t('help.introContent.storage.persistence')}
            </li>
            <li>
              {t('help.introContent.storage.backups')}
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">{t('help.introContent.coreElements')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {Object.values(ElementType).map(type => (
            <div key={type} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                style={{ backgroundColor: ELEMENT_STYLE[type].color, color: ELEMENT_STYLE[type].textColor }}
              >
                {ELEMENT_MAP[type].icon}
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-300">{ELEMENT_MAP[type].name}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{t('help.introContent.patterns.title')}</h3>
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
              {t('help.introContent.patterns.stateChange.title')}
            </h4>
            <div className="text-sm text-slate-500 dark:text-slate-400 font-mono mb-2 flex items-center flex-wrap gap-1">
              <span className="font-semibold text-slate-800 dark:text-slate-300">{t('modeling.elements.screen')}</span> →
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Command].color }}>{t('modeling.elements.command')}</span> →
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>{t('modeling.elements.domainEvent')}(s)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              {t('help.introContent.patterns.stateChange.description')}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
              {t('help.introContent.patterns.stateView.title')}
            </h4>
            <div className="text-sm text-slate-500 font-mono mb-2 flex items-center flex-wrap gap-1">
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>{t('modeling.elements.domainEvent')}(s)</span> →
              <span className="font-semibold" style={{ color: ELEMENT_STYLE.READ_MODEL.color }}>{t('modeling.elements.readModel')}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              {t('help.introContent.patterns.stateView.description')}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
              {t('help.introContent.patterns.automation.title')}
            </h4>
            <div className="text-sm text-slate-500 font-mono mb-2 flex items-center flex-wrap gap-1">
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>{t('modeling.elements.domainEvent')}(s)</span> →
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.ReadModel].color }}>{t('modeling.elements.readModel')}</span> →
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Automation].color }}>{t('modeling.elements.automation')}</span> →
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Command].color }}>{t('modeling.elements.command')}</span> →
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>{t('modeling.elements.domainEvent')}(s)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              {t('help.introContent.patterns.automation.description')}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-1">
              {t('help.introContent.patterns.translation.title')}
            </h4>
            <div className="text-sm text-slate-500 font-mono mb-2 flex items-center flex-wrap gap-1">
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.IntegrationEvent].textColor }}>{t('modeling.elements.integrationEvent')}</span> →
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Automation].color }}>{t('modeling.elements.automation')}</span> →
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Command].color }}>{t('modeling.elements.command')}</span> →
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.IntegrationEvent].textColor }}>{t('modeling.elements.integrationEvent')}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              {t('help.introContent.patterns.translation.description')}
            </p>
          </div>

        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          {t('help.introContent.antiPatterns.title')}
        </h3>
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-1">{t('help.introContent.antiPatterns.leftChair.title')}</h4>
            <div className="text-sm text-slate-500 font-mono mb-2 flex items-center flex-wrap gap-1">
              <span className="font-semibold">{t('modeling.elements.screen')}</span> →
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Command].color }}>{t('modeling.elements.command')}</span> →
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>{t('modeling.elements.domainEvent')}</span> +
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>{t('modeling.elements.domainEvent')}</span> +
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>{t('modeling.elements.domainEvent')}...</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              {t('help.introContent.antiPatterns.leftChair.description')}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-1">{t('help.introContent.antiPatterns.rightChair.title')}</h4>
            <div className="text-sm text-slate-500 font-mono mb-2 flex items-center flex-wrap gap-1">
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>{t('modeling.elements.domainEvent')}</span> +
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>{t('modeling.elements.domainEvent')}</span> +
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.DomainEvent].color }}>{t('modeling.elements.domainEvent')}</span> →
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.ReadModel].color }}>{t('modeling.elements.readModel')}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              {t('help.introContent.antiPatterns.rightChair.description')}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-1">{t('help.introContent.antiPatterns.bed.title')}</h4>
            <div className="text-sm text-slate-500 font-mono mb-2 flex items-center flex-wrap gap-1">
              <span className="font-semibold">{t('modeling.elements.screen')}</span> →
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Command].color }}>{t('modeling.elements.command')}</span> +
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Command].color }}>{t('modeling.elements.command')}</span> +
              <span className="font-semibold" style={{ color: ELEMENT_STYLE[ElementType.Command].color }}>{t('modeling.elements.command')}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              {t('help.introContent.antiPatterns.bed.description')}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-1">{t('help.introContent.antiPatterns.bookshelf.title')}</h4>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              {t('help.introContent.antiPatterns.bookshelf.description')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SemanticsContent = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-8 pb-4">
      <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100/50 dark:border-purple-500/10 rounded-xl p-5">
        <h3 className="text-purple-900 dark:text-purple-300 font-bold mb-2 flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          {t('help.semanticsContent.title')}
        </h3>
        <p className="text-purple-700/80 dark:text-purple-400/80 text-sm leading-relaxed">
          {t('help.semanticsContent.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 1. Data Dictionary */}
        <div className="group relative bg-white/5 dark:bg-black/20 p-5 rounded-xl border border-slate-200/50 dark:border-white/5 transition-all hover:border-purple-500/30">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{t('help.semanticsContent.dictionary.title')}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                <Trans i18nKey="help.semanticsContent.dictionary.description" components={{ strong: <strong />, kbd: <Kbd /> }} />
              </p>
            </div>
          </div>
        </div>

        {/* 2. Properties Panel */}
        <div className="group relative bg-white/5 dark:bg-black/20 p-5 rounded-xl border border-slate-200/50 dark:border-white/5 transition-all hover:border-purple-500/30">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Settings className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{t('help.semanticsContent.fields.title')}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                <Trans i18nKey="help.semanticsContent.fields.description" components={{ strong: <strong />, kbd: <Kbd /> }} />
              </p>
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                  <div className="w-6 h-6 flex items-center justify-center bg-amber-500/10 border border-amber-500/30 rounded text-amber-600"><CheckSquare size={12} /></div>
                  <span>{t('help.semanticsContent.fields.required')}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                  <div className="w-6 h-6 flex items-center justify-center bg-blue-500/10 border border-blue-500/30 rounded text-blue-500"><Eye size={12} /> / <Keyboard size={12} /></div>
                  <span>{t('help.semanticsContent.fields.roles')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Information Completeness */}
        <div className="group relative bg-white/5 dark:bg-black/20 p-5 rounded-xl border border-slate-200/50 dark:border-white/5 transition-all hover:border-purple-500/30">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <BadgeAlert size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{t('help.semanticsContent.completeness.title')}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                <Trans i18nKey="help.semanticsContent.completeness.description" components={{ strong: <strong />, kbd: <Kbd /> }} />
              </p>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <BadgeAlert size={14} className="text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-600 uppercase">{t('help.semanticsContent.completeness.flag')}</span>
                </div>
                <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70 italic">
                  "<Trans i18nKey="help.semanticsContent.completeness.example" components={{ strong: <strong />, kbd: <Kbd /> }} />"
                </p>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <Trans i18nKey="help.semanticsContent.completeness.note" components={{ strong: <strong />, kbd: <Kbd /> }} />
              </p>
            </div>
          </div>
        </div>

        {/* 4. Aggregates */}
        <div className="group relative bg-white/5 dark:bg-black/20 p-5 rounded-xl border border-slate-200/50 dark:border-white/5 transition-all hover:border-purple-500/30">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Globe className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{t('help.semanticsContent.aggregates.title')}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                <Trans i18nKey="help.semanticsContent.aggregates.description" components={{ strong: <strong />, kbd: <Kbd /> }} />
              </p>
            </div>
          </div>
        </div>

        {/* 5. Slices */}
        <div className="group relative bg-white/5 dark:bg-black/20 p-5 rounded-xl border border-slate-200/50 dark:border-white/5 transition-all hover:border-purple-500/30">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Layers className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{t('help.semanticsContent.slices.title')}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                <Trans i18nKey="help.semanticsContent.slices.description" components={{ strong: <strong />, kbd: <Kbd /> }} />
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ControlsContent = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{t('help.controlsContent.canvasBasics')}</h3>
        <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
          <li><Trans i18nKey="help.controlsContent.pan" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.horizontalPan" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.zoom" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.deselectAll" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{t('help.controlsContent.workingWithElements')}</h3>
        <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
          <li>
            <Trans
              i18nKey="help.controlsContent.addElement"
              components={{
                strong: <strong />,
                kbd: <Kbd />,
                plus: <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-500 text-white rounded-full font-bold">+</span>
              }}
            />
          </li>
          <li><Trans i18nKey="help.controlsContent.quickAdd" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.selectAll" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.singleSelect" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.multiSelect" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.moveSingle" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.moveMultiple" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.delete" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.navigate" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.focusNode" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.duplicate" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.copyPaste" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{t('help.controlsContent.propertiesPanel')}</h3>
        <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
          <li><Trans i18nKey="help.controlsContent.openPanel" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.closePanel" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.multiEdit" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{t('help.controlsContent.sidebarNavigation')}</h3>
        <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
          <li><Trans i18nKey="help.controlsContent.openProperties" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.openDictionary" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.openSlices" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
          <li><Trans i18nKey="help.controlsContent.openActors" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{t('help.controlsContent.creatingRelationships')}</h3>
        <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
          <li>
            <Trans
              i18nKey="help.controlsContent.jumpToRelationships"
              components={{
                strong: <strong />,
                kbd: <Kbd />,
                plus: <span className="inline-flex items-center justify-center w-5 h-5 bg-indigo-600 text-white rounded-full text-[10px]">+</span>
              }}
            />
          </li>
          <li>
            <Trans
              i18nKey="help.controlsContent.drawConnection"
              components={{
                strong: <strong />,
                kbd: <Kbd />,
                plus: <span className="inline-flex items-center justify-center w-5 h-5 bg-indigo-600 text-white rounded-full text-[10px]">+</span>
              }}
            />
          </li>
          <li><Trans i18nKey="help.controlsContent.quickDraw" components={{ strong: <strong />, kbd: <Kbd /> }} /></li>
        </ul>
      </div>
    </div>
  );
};


const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, onImport }) => {
  const { t } = useTranslation();

  const handleLoadExample = async () => {
    try {
      const response = await fetch(`/examples/weavr-model.json?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to load example');
      const blob = await response.blob();
      const file = new File([blob], 'Weavr-Self-Model.json', { type: 'application/json' });
      onImport(file);
      onClose();
    } catch (error) {
      console.error('Error loading example:', error);
      alert(t('help.loadExampleError'));
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-card max-w-[95vw] w-full md:max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/10 shrink-0">
          <DialogTitle className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
            {t('help.title')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="introduction" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-2 border-b border-white/5 bg-white/5">
            <TabsList className="bg-transparent border-none gap-2">
              <TabsTrigger value="introduction" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary dark:data-[state=active]:bg-primary/20">
                {t('help.introduction')}
              </TabsTrigger>
              <TabsTrigger value="semantics" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary dark:data-[state=active]:bg-primary/20">
                {t('help.semantics')}
              </TabsTrigger>
              <TabsTrigger value="controls" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary dark:data-[state=active]:bg-primary/20">
                {t('help.controls')}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <TabsContent value="introduction" className="mt-0 focus-visible:outline-none">
              <IntroductionContent onLoadExample={handleLoadExample} />
            </TabsContent>
            <TabsContent value="semantics" className="mt-0 focus-visible:outline-none">
              <SemanticsContent />
            </TabsContent>
            <TabsContent value="controls" className="mt-0 focus-visible:outline-none">
              <ControlsContent />
            </TabsContent>
          </div>
        </Tabs>

        <div className="p-6 border-t border-white/10 shrink-0 bg-white/5 rounded-b-xl flex justify-end">
          <Button
            size="lg"
            onClick={onClose}
            className="rounded-full px-8 font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            {t('help.gotIt')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpModal;