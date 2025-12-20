import React, { useEffect, useRef } from 'react';
import { useTelemetryDeck } from "@typedigital/telemetrydeck-react";

const getDisplayMetadata = () => {
    const isLandscape = window.innerWidth > window.innerHeight;
    return {
        screenResolutionWidth: window.screen.width.toString(),
        screenResolutionHeight: window.screen.height.toString(),
        screenScaleFactor: window.devicePixelRatio.toString(),
        orientation: isLandscape ? 'landscape' : 'portrait',
        colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
        url: window.location.href,
        referrer: document.referrer || 'direct'
    };
};

export const useTelemetry = () => {
    const { signal: originalSignal } = useTelemetryDeck();

    const signal = (type: string, payload?: Record<string, string>) => {
        originalSignal(type, {
            ...getDisplayMetadata(),
            ...payload
        });
    };

    return { signal };
};

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

            // Send explicit pageView signal as suggested in JS SDK docs
            signal("pageView", {
                path: window.location.pathname,
                hash: window.location.hash
            });

            hasSentLaunch.current = true;
        }
    }, [signal, isReady, nodeCount, linkCount]);

    return null;
};
