import React, { useEffect } from 'react';
import { useTelemetryDeck } from "@typedigital/telemetrydeck-react";

export const AppTelemetry: React.FC = () => {
    const { signal } = useTelemetryDeck();

    useEffect(() => {
        signal("App.Launch");
    }, [signal]);

    return null;
};
