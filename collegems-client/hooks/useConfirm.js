import { useState, useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';

export const useConfirm = (action, onConfirm) => {
    const [isOpen, setIsOpen] = useState(false);
    const { settings } = useSettings();

    const confirm = useCallback((data) => {
        // Check if confirmation is enabled for this action
        const needsConfirmation = settings?.confirmations?.[action] !== false;

        if (needsConfirmation) {
            // Show confirmation dialog
            setIsOpen(true);
            // Store data to pass on confirm
            window.__confirmData = data;
        } else {
            // Skip confirmation
            onConfirm(data);
        }
    }, [action, settings, onConfirm]);

    const handleConfirm = useCallback(() => {
        setIsOpen(false);
        onConfirm(window.__confirmData);
    }, [onConfirm]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        window.__confirmData = null;
    }, []);

    return {
        confirm,
        isOpen,
        handleConfirm,
        handleClose
    };
};