import { useState, useCallback } from 'react';

export interface OmnibarState {
  isOpen: boolean;
  targetId: string | null;
  targetKind: 'node' | 'link' | null;
  position: { x: number; y: number };
  initialFocus?: 'name' | 'relation';
}

const INITIAL_STATE: OmnibarState = {
  isOpen: false,
  targetId: null,
  targetKind: null,
  position: { x: 0, y: 0 },
  initialFocus: 'name',
};

export function useOmnibarState() {
  const [state, setState] = useState<OmnibarState>(INITIAL_STATE);

  const openForNode = useCallback((nodeId: string, screenPos: { x: number; y: number }, initialFocus: 'name' | 'relation' = 'name') => {
    setState({
      isOpen: true,
      targetId: nodeId,
      targetKind: 'node',
      position: screenPos,
      initialFocus,
    });
  }, []);

  const openForLink = useCallback((linkId: string, screenPos: { x: number; y: number }) => {
    setState({
      isOpen: true,
      targetId: linkId,
      targetKind: 'link',
      position: screenPos,
      initialFocus: 'name',
    });
  }, []);

  const close = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    openForNode,
    openForLink,
    close,
  };
}
