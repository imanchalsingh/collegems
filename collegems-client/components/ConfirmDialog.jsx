import React from 'react';

const ConfirmDialog = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel',
    variant = 'danger' // danger, warning, info
}) => {
    if (!isOpen) return null;

    const variantColors = {
        danger: {
            bg: 'bg-red-600',
            hover: 'hover:bg-red-700'
        },
        warning: {
            bg: 'bg-yellow-600',
            hover: 'hover:bg-yellow-700'
        },
        info: {
            bg: 'bg-blue-600',
            hover: 'hover:bg-blue-700'
        }
    };

    const colors = variantColors[variant] || variantColors.danger;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {message}
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-medium text-white ${colors.bg} ${colors.hover} rounded-lg transition`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;