import { Node, ElementType, Link } from './types';

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

  // Data from external systems can feed views directly
  { source: ElementType.IntegrationEvent, target: ElementType.ReadModel, verb: 'populates', description: 'Data from an integration event can populate a read model.' },

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

  /**
   * Validates Data Completeness (Lineage).
   * Checks if required fields in the target node are present in the source nodes.
   */
  public validateCompleteness(node: Node, incomingLinks: Link[], sourceNodes: Node[]): ValidationResult {
    const requiredFields = (node.fields || []).filter(f => f.required);
    if (requiredFields.length === 0) return { isValid: true, missingFields: [] };

    // 1. Core Origins (Entry Points)
    if (node.type === ElementType.Screen) {
      const availableFields = new Set<string>();
      incomingLinks.forEach(link => {
        const source = sourceNodes.find(n => n.id === link.source);
        if (source?.type === ElementType.ReadModel) {
          (source.fields || []).forEach(f => availableFields.add(f.name));
        }
      });

      const missing = requiredFields.filter(f => !availableFields.has(f.name));
      if (missing.length > 0 && incomingLinks.length > 0) {
        return {
          isValid: false,
          missingFields: missing.map(f => f.name),
          message: `Screen missing data from Read Model: ${missing.map(f => f.name).join(', ')}`
        };
      }
      return { isValid: true, missingFields: [] };
    }

    if (node.type === ElementType.IntegrationEvent && incomingLinks.length === 0) {
      return { isValid: true, missingFields: [] };
    }

    // 2. Link Availability
    if (incomingLinks.length === 0) {
      return {
        isValid: false,
        missingFields: requiredFields.map(f => f.name),
        message: `Incomplete: No incoming data source for required fields.`
      };
    }

    // 3. Detailed Per-Source Validation
    const sourceDetails: { nodeName: string, nodeType: string, missingFields: string[] }[] = [];
    let globallyMissing: string[] = [];

    incomingLinks.forEach(link => {
      const source = sourceNodes.find(n => n.id === link.source);
      if (!source) return;

      const sourceFields = source.fields || [];
      const sourceMissing = requiredFields.filter(rf => {
        // Strict Match (if definitionId exists)
        if (rf.definitionId) {
          return !sourceFields.some(sf => sf.name === rf.name && sf.definitionId === rf.definitionId);
        }
        // Name Match
        return !sourceFields.some(sf => sf.name === rf.name);
      });

      if (sourceMissing.length > 0) {
        sourceDetails.push({
          nodeName: source.name || 'Unnamed Source',
          nodeType: source.type.toUpperCase(),
          missingFields: sourceMissing.map(m => m.name)
        });
      }
    });

    if (sourceDetails.length > 0) {
      // Aggregate all missing field names for the summary list
      const allMissingSet = new Set<string>();
      sourceDetails.forEach(d => d.missingFields.forEach(f => allMissingSet.add(f)));
      globallyMissing = Array.from(allMissingSet);

      // Construct a really helpful message
      const detailLines = sourceDetails.map(d => `<<${d.nodeType}>> ${d.nodeName} is missing: ${d.missingFields.join(', ')}`);
      
      // If only one source, keep it simple
      if (sourceDetails.length === 1) {
        const detail = sourceDetails[0];
        return {
          isValid: false,
          missingFields: globallyMissing,
          message: `Missing from <<${detail.nodeType}>> ${detail.nodeName}: ${detail.missingFields.join(', ')}`
        };
      }

      // Multi-source details
      return {
        isValid: false,
        missingFields: globallyMissing,
        message: `Lineage gaps found:\n${detailLines.join('\n')}`
      };
    }

    return { isValid: true, missingFields: [] };
  }

  /**
   * Generates a string summary of fields flowing from source to target.
   */
  public getLinkFlowLabel(sourceNode: Node, _targetNode: Node): string {
    if (!sourceNode.fields || sourceNode.fields.length === 0) return '';

    // In Weavr, the fields of the source element (Command/Event/ReadModel) 
    // represent what is flowing into the next state.
    const fieldNames = sourceNode.fields.map(f => f.name);

    if (fieldNames.length === 0) return '';
    if (fieldNames.length > 3) {
      return `${fieldNames.slice(0, 3).join(', ')} (+${fieldNames.length - 3} more)`;
    }
    return fieldNames.join(', ');
  }
}

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  message?: string;
}

const validationService = new ValidationService();
export default validationService;