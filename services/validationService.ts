import { Node, ElementType } from '../types';

interface ConnectionRule {
  source: ElementType;
  target: ElementType;
  verb: string;
  description: string;
}

const connectionRules: ConnectionRule[] = [
  { source: ElementType.Screen, target: ElementType.Command, verb: 'triggers', description: 'A user interaction on a screen triggers a command.' },
  { source: ElementType.Command, target: ElementType.EventInternal, verb: 'results in', description: 'A successful command results in one or more internal events.' },
  { source: ElementType.EventInternal, target: ElementType.ReadModel, verb: 'populates', description: 'Internal events are used to build and update read models.' },
  { source: ElementType.ReadModel, target: ElementType.Screen, verb: 'is displayed on', description: 'Data from a read model is displayed on a screen.' },
  { source: ElementType.EventInternal, target: ElementType.Command, verb: 'triggers', description: 'An internal event can trigger a command as part of an automation.' },
  { source: ElementType.ReadModel, target: ElementType.Command, verb: 'informs', description: 'A read model provides data to an automation to inform a command.' },
  { source: ElementType.EventExternal, target: ElementType.Command, verb: 'triggers', description: 'An external event can trigger a command to integrate external data.' },
  { source: ElementType.EventExternal, target: ElementType.ReadModel, verb: 'populates', description: 'Data from an external event can populate a read model.' },
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