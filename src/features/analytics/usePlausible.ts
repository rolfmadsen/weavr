import { init, track } from '@plausible-analytics/tracker';
import { useEffect, useRef } from 'react';

// Initialize on load (if not already)
// We use a singleton pattern for the tracker instance logic if needed,
// but 'init' and 'track' are global exports in the library.

// Configuration
const DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN || 'weavr.dk';

export const usePlausible = () => {
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            init({
                domain: DOMAIN,
                hashBasedRouting: true,
                // Enable localhost tracking for testing purposes
                captureOnLocalhost: true,
                // Redact sensitive hash (Model ID) from URL
                transformRequest: (eventData: any) => {
                    const url = new URL(eventData.url);
                    if (url.hash && url.hash.length > 2) {
                        url.hash = '#/model'; // Replace specific ID with generic placeholder
                        eventData.url = url.toString();
                    }
                    return eventData;
                },
            });
            initialized.current = true;
        }
    }, []);

    const signal = (eventName: string, props?: Record<string, any>) => {
        // Weavr's "signal" pattern often sends complex nested objects.
        // Plausible properties are flat { string: string | number | boolean }.
        // TSA: Types require string values.
        const cleanProps: Record<string, string> = {};

        if (props) {
            Object.entries(props).forEach(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    try {
                        cleanProps[key] = JSON.stringify(value).slice(0, 200);
                    } catch (e) { }
                } else {
                    cleanProps[key] = String(value);
                }
            });
        }

        track(eventName, { props: cleanProps });
    };

    return { signal };
};
