import React, { useMemo } from 'react';
import { TelemetryDeckProvider } from "@typedigital/telemetrydeck-react";
import { initTelemetry } from '../store/telemetryService';
import { usePageTracking } from '../store/usePageTracking';
import { useErrorTracking } from '../store/useErrorTracking';

const TelemetryListeners: React.FC = () => {
    usePageTracking();
    useErrorTracking();
    return null;
};

interface TelemetryProviderProps {
    children: React.ReactNode;
}

export const TelemetryProvider: React.FC<TelemetryProviderProps> = ({ children }) => {
    const td = useMemo(() => initTelemetry(), []);

    if (!td) {
        // Fallback or dev mode log
        if (import.meta.env.DEV) {
            console.warn("TelemetryDeck App ID not found or initialized.");
        }
        return <>{children}</>;
    }

    return (
        <TelemetryDeckProvider telemetryDeck={td}>
            <TelemetryListeners />
            {children}
        </TelemetryDeckProvider>
    );
};
