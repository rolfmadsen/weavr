import React, { useEffect, useRef } from 'react';
import { useTelemetry } from '../store/useTelemetry';

interface AppTelemetryProps {
    nodeCount?: number;
    linkCount?: number;
    isReady?: boolean;
}

export const AppTelemetry: React.FC<AppTelemetryProps> = ({ nodeCount, linkCount, isReady }) => {
    const { signal } = useTelemetry();
    const hasSentLaunch = useRef(false);

    useEffect(() => {
        if (isReady && !hasSentLaunch.current) {
            const metadata: Record<string, string> = {};
            if (nodeCount !== undefined) metadata.nodeCount = nodeCount.toString();
            if (linkCount !== undefined) metadata.linkCount = linkCount.toString();

            // Send standard launch signal
            signal("App.Launch", metadata);



            hasSentLaunch.current = true;
        }
    }, [signal, isReady, nodeCount, linkCount]);

    return null;
};
