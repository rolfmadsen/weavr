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

    // 1. Root Source Exceptions (Entry Points)
    // Screens are the origin of user input (Lineage is implicit/unlimited).
    if (node.type === ElementType.Screen) {
      // Screens also display data from Read Models.
      // If a Screen has required fields, they MUST come from a Read Model.
      const availableFields = new Set<string>();
      incomingLinks.forEach(link => {
        const source = sourceNodes.find(n => n.id === link.source);
        if (source?.type === ElementType.ReadModel) {
          (source.fields || []).forEach(f => availableFields.add(f.name));
        }
      });

      const missing = requiredFields.filter(f => !availableFields.has(f.name));
      if (missing.length > 0) {
        // Only warn if there ARE incoming links. If no links, we assume it's a "User View" with fields we don't track yet.
        // Wait, if it has required fields and no links, it's definitely missing data.
        if (incomingLinks.length > 0) {
          return {
            isValid: false,
            missingFields: missing.map(f => f.name),
            message: `Screen missing data from Read Model: ${missing.map(f => f.name).join(', ')}`
          };
        }
      }
      return { isValid: true, missingFields: [] };
    }

    // 2. Root Source Exceptions (Entry Points)
    // Integration Events with NO incoming links are root sources (External Fact).
    // Note: Screens are handled by the broad exception at the top of the method.
    if (node.type === ElementType.IntegrationEvent && incomingLinks.length === 0) {
      return { isValid: true, missingFields: [] };
    }

    // 3. Standard Lineage Check for all other nodes
    if (incomingLinks.length === 0) {
      return {
        isValid: false,
        missingFields: requiredFields.map(f => f.name),
        message: `Information Incomplete: Node has required fields but no incoming data source.`
      };
    }

    const availableFields = new Set<string>();
    incomingLinks.forEach(link => {
      const source = sourceNodes.find(n => n.id === link.source);
      if (!source) return;

      // Logic check based on Target node type
      switch (node.type) {
        case ElementType.Command:
          // Commands source from Screen (wildcard) or Automation (explicit)
          if (source.type === ElementType.Screen) {
            // ... existing Screen logic (Screen fields might not have definitionIds yet, but if they do, we could enforce it. 
            // For now, Screen is "User Input", so we trust the name mapping more loosely unless we want to be very strict)
            (source.fields || []).forEach(f => availableFields.add(f.name));
          } else if (source.type === ElementType.Automation) {
            (source.fields || []).forEach(() => {
              // For Automation, we just collect fields, but we need to know WHICH ones matched strictly.
              // Actually, availableFields is just a Set<string> of names. This is the flaw.
              // We need to store more metadata or change the check loop below.
            });
          }
          break;
        // ...
      }

      // REFACTOR: Instead of just collecting names, let's collect "Validated Fields" directly from the source logic
      // But to be minimally invasive, we can just filter the source fields that match our strict criteria and add THEIR names.

      let validSourceFields: { name: string, definitionId?: string }[] = [];

      switch (node.type) {
        case ElementType.Command:
          if (source.type === ElementType.Screen) {
            validSourceFields = source.fields || [];
          } else if (source.type === ElementType.Automation) {
            validSourceFields = source.fields || [];
          }
          break;

        case ElementType.DomainEvent:
        case ElementType.IntegrationEvent:
          if (source.type === ElementType.Command || source.type === ElementType.Automation) {
            validSourceFields = source.fields || [];
          }
          break;

        case ElementType.ReadModel:
          if (source.type === ElementType.DomainEvent || source.type === ElementType.IntegrationEvent) {
            validSourceFields = source.fields || [];
          }
          break;

        case ElementType.Automation:
          if (
            source.type === ElementType.DomainEvent ||
            source.type === ElementType.IntegrationEvent ||
            source.type === ElementType.ReadModel
          ) {
            validSourceFields = source.fields || [];
          }
          break;
      }

      // Now add to availableFields ONLY if they pass strict matching against the TARGET requirements
      // Wait, we don't know which target field we are matching against yet.
      // We are building a pool of "Available Data".
      // The issue is that "Available Data" (Person.name) is NOT compatible with "Required Data" (OrgPerson.name).

      // So, for every field provided by the source, we can add it to availableFields SET
      // BUT, we should probably encode the definitionId in the set key? e.g. "name::def-123"
      // OR, simpler: We iterate required fields and check against source fields directly.

      validSourceFields.forEach(sf => {
        // Add simple name (legacy compatibility)
        availableFields.add(sf.name);
        // Add strict key if definitionId exists
        if (sf.definitionId) {
          availableFields.add(`${sf.name}::${sf.definitionId}`);
        }
      });
    });

    const missing = requiredFields.filter(f => {
      // If the target field has a definitionId, we REQUIRE that the source provided it with that same definitionId.
      if (f.definitionId) {
        const strictKey = `${f.name}::${f.definitionId}`;
        return !availableFields.has(strictKey);
      }
      // Fallback to name-only check
      return !availableFields.has(f.name);
    });

    if (missing.length > 0) {
      return {
        isValid: false,
        missingFields: missing.map(f => f.name),
        message: `Required data is missing from sources: ${missing.map(f => f.name).join(', ')}`
      };
    }

    return { isValid: true, missingFields: [] };
  }
}

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  message?: string;
}

const validationService = new ValidationService();
export default validationService;