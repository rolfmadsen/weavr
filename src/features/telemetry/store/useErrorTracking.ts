import { useEffect } from 'react';
import { useTelemetry } from "./useTelemetry";

export const useErrorTracking = () => {
    const { signal } = useTelemetry();

    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            signal("App.Exception", {
                message: event.message,
                filename: event.filename,
                lineno: String(event.lineno),
                colno: String(event.colno),
                type: event.error?.name || "UnknownError"
            });
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            signal("App.PromiseRejection", {
                reason: String(event.reason)
            });
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, [signal]);
};
