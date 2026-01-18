import { useEffect, useRef } from 'react';
import { useTelemetry } from "./useTelemetry";

export const usePageTracking = () => {
    const { signal } = useTelemetry();

    const previousHash = useRef("outside");

    useEffect(() => {
        const handleHashChange = () => {
            const currentHash = window.location.hash || '#start';
            const source = previousHash.current;
            const destination = currentHash;

            if (source !== destination) {
                const identifier = `${source} -> ${destination}`;
                signal("TelemetryDeck.Navigation.pathChanged", {
                    "TelemetryDeck.Navigation.schemaVersion": "1",
                    "TelemetryDeck.Navigation.sourcePath": source,
                    "TelemetryDeck.Navigation.destinationPath": destination,
                    "TelemetryDeck.Navigation.identifier": identifier
                });
                previousHash.current = currentHash;
            }
        };

        // Capture initial load
        handleHashChange();

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [signal]);
};
