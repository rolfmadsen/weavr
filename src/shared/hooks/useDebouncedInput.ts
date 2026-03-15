import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * A hook for managing local input state with debounced updates to a parent handler.
 * Breaking the feedback loop in controlled components prevents cursor jumping.
 */
export function useDebouncedInput(
    initialValue: string,
    onUpdate: (value: string) => void,
    delay: number = 300
) {
    const [localValue, setLocalValue] = useState(initialValue);
    const [isFocused, setIsFocused] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSyncedValue = useRef(initialValue);

    // Sync from props only when not focused or if the change is "external"
    useEffect(() => {
        if (!isFocused && initialValue !== localValue) {
            setLocalValue(initialValue);
            lastSyncedValue.current = initialValue;
        }
    }, [initialValue, isFocused, localValue]);

    const debouncedUpdate = useCallback((value: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        timeoutRef.current = setTimeout(() => {
            if (value !== lastSyncedValue.current) {
                onUpdate(value);
                lastSyncedValue.current = value;
            }
            timeoutRef.current = null;
        }, delay);
    }, [onUpdate, delay]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        debouncedUpdate(newValue);
    };

    const handleBlur = () => {
        setIsFocused(false);
        // Force immediate sync on blur if pending
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
            if (localValue !== lastSyncedValue.current) {
                onUpdate(localValue);
                lastSyncedValue.current = localValue;
            }
        }
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            if (localValue !== lastSyncedValue.current) {
                onUpdate(localValue);
                lastSyncedValue.current = localValue;
            }
        }
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return {
        value: localValue,
        onChange: handleChange,
        onBlur: handleBlur,
        onFocus: handleFocus,
        onKeyDown: handleKeyDown
    };
}
