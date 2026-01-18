import { useTelemetryDeck } from "@typedigital/telemetrydeck-react";

export const getDisplayMetadata = () => {
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
        const enrichedPayload = {
            ...getDisplayMetadata(),
            ...payload
        };

        if (import.meta.env.DEV) {
            console.debug(`[Telemetry] Signal: ${type}`, enrichedPayload);
        }

        originalSignal(type, enrichedPayload);
    };

    return { signal };
};
