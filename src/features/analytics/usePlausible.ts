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
                // Disable auto-capture to ensure full control via manual tracking and transformation
                autoCapturePageviews: false,
                // Redact sensitive hash (Model ID) from URL
                transformRequest: (eventData: any) => {
                    try {
                        // Plausible uses 'u' for the URL in the payload
                        // We use window.location.origin as base in case url is relative
                        const url = new URL(eventData.u, window.location.origin);

                        // Check if we have a hash which is likely a Model ID (UUID)
                        // A UUID is 36 chars, so we check for significant length
                        if (url.hash && url.hash.length > 10) {
                            url.hash = '#/model'; // Replace specific ID with generic placeholder
                            eventData.u = url.toString();
                        }
                    } catch (error) {
                        // If URL parsing fails, ignore and return original data
                        console.warn('Plausible: Failed to transform URL', error);
                    }
                    return eventData;
                },
            });
            // Manually track pageview after init to ensure transformRequest is applied
            track('pageview', {});
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
