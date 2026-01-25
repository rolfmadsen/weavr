import { Node, ElementType } from './types';

interface ConnectionRule {
  source: ElementType;
  target: ElementType;
  verb: string;
  description: string;
}

const connectionRules: ConnectionRule[] = [
  // State Change & State View patterns
  { source: ElementType.Screen, target: ElementType.Command, verb: 'triggers', description: 'A user interaction on a screen triggers a command.' },
  { source: ElementType.Command, target: ElementType.DomainEvent, verb: 'results in', description: 'A successful command results in one or more domain events.' },
  { source: ElementType.DomainEvent, target: ElementType.ReadModel, verb: 'populates', description: 'Domain events are used to build and update read models.' },
  { source: ElementType.ReadModel, target: ElementType.Screen, verb: 'is displayed on', description: 'Data from a read model is displayed on a screen.' },

  // Automation & Translation patterns
  { source: ElementType.Automation, target: ElementType.Command, verb: 'issues', description: 'An automation issues a command to perform a system action.' },
  { source: ElementType.DomainEvent, target: ElementType.Automation, verb: 'triggers', description: 'A domain event triggers an automation process.' },
  { source: ElementType.IntegrationEvent, target: ElementType.Automation, verb: 'triggers', description: 'An integration event triggers a translation process.' },
  { source: ElementType.ReadModel, target: ElementType.Automation, verb: 'informs', description: 'A read model provides data to inform an automation.' },

  // Data from external systems can feed views directly - REMOVED FOR STRICT MODE
  // { source: ElementType.IntegrationEvent, target: ElementType.ReadModel, verb: 'populates', description: 'Data from an integration event can populate a read model.' },

  // User requested Integration Event connections (Outputs to external systems)
  { source: ElementType.ReadModel, target: ElementType.IntegrationEvent, verb: 'triggers', description: 'A read model triggers an integration event (e.g. periodic export).' },
  { source: ElementType.Command, target: ElementType.IntegrationEvent, verb: 'results in', description: 'A command results in an external integration event.' },
];


class ValidationService {
  public getConnectionRule(source: Node, target: Node): ConnectionRule | undefined {
    if (!source || !target) return undefined;

    return connectionRules.find(rule =>
      rule.source === source.type && rule.target === target.type
    );
  }

  public isValidConnection(source: Node, target: Node): boolean {
    return !!this.getConnectionRule(source, target);
  }

  public getRules(): readonly ConnectionRule[] {
    return connectionRules;
  }
}

const validationService = new ValidationService();
export default validationService;