import { useMemo } from 'react';
import { Node, Link } from '../domain/types';
import validationService, { ValidationResult } from '../domain/validation';

/**
 * Single-node validation hook — for use in NodeProperties sidebar.
 */
export function useNodeValidation(node: Node, allNodes: Node[], allLinks: Link[]): ValidationResult {
  return useMemo(() => {
    const incomingLinks = allLinks.filter(l => l.target === node.id);
    return validationService.validateCompleteness(node, incomingLinks, allNodes);
  }, [node, allNodes, allLinks]);
}

/**
 * Batch validation map — for use in GraphCanvas.
 * Returns a Map of only INVALID nodes (nodeId → ValidationResult).
 * Computed once per nodes/links change, avoids per-node Zustand subscriptions.
 */
export function useValidationMap(nodes: Node[], links: Link[]): Map<string, ValidationResult> {
  return useMemo(() => {
    const map = new Map<string, ValidationResult>();
    for (const node of nodes) {
      const requiredFields = (node.fields || []).filter(f => f.required);
      // Skip nodes with no required fields (fast path — avoid unnecessary processing)
      if (requiredFields.length === 0) continue;

      const incoming = links.filter(l => l.target === node.id);
      const result = validationService.validateCompleteness(node, incoming, nodes);
      if (!result.isValid) {
        map.set(node.id, result);
      }
    }
    return map;
  }, [nodes, links]);
}
