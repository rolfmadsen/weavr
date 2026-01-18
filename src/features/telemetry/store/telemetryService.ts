import { createTelemetryDeck } from "@typedigital/telemetrydeck-react";

export function getOrCreateUserId(): string {
    const STORAGE_KEY = 'td_client_user'; // Aligning with article recommendation
    let userId = localStorage.getItem(STORAGE_KEY);
    if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, userId);
    }
    return userId;
}

export const initTelemetry = () => {
    const appID = import.meta.env.VITE_TELEMETRYDECK_APP_ID;
    const testMode = import.meta.env.VITE_TELEMETRYDECK_TEST_MODE === 'true' || import.meta.env.DEV;

    if (!appID) return null;

    return createTelemetryDeck({
        appID,
        clientUser: getOrCreateUserId(),
        testMode
    });
};
