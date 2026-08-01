import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DEFAULT_ACADEMIC_LABELS } from "../constants/academicLabels";

const Settings = () => {
    const [settings, setSettings] = useState({
        confirmations: {
            delete: true,
            publish: true,
            archive: true,
            update: false
        },
        academicLabels: { ...DEFAULT_ACADEMIC_LABELS }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

 

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
            const data = response.data.data;

            setSettings({
                confirmations: {
                    delete: data.confirmations?.delete ?? true,
                    publish: data.confirmations?.publish ?? true,
                    archive: data.confirmations?.archive ?? true,
                    update: data.confirmations?.update ?? false,
                },

                academicLabels: {
                    ...DEFAULT_ACADEMIC_LABELS,
                    ...(data.academicLabels || {}),
                },
            });
        }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };
   useEffect(() => {
        fetchSettings();
    }, []);
    const handleToggle = (action) => {
        setSettings(prev => ({
            ...prev,
            confirmations: {
                ...prev.confirmations,
                [action]: !prev.confirmations[action]
            }
        }));
    };

    const handleLabelChange = (key, value) => {
    setSettings(prev => ({
        ...prev,
        academicLabels: {
            ...prev.academicLabels,
            [key]: value,
        },
    }));
};


    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put('/api/settings', settings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Settings saved successfully!');
        } catch (error) {
            alert('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-6">Loading settings...</div>;
    }

    return (
        <div className="p-6 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">⚙️ Settings</h1>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Confirmation Dialogs</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                    Enable/disable confirmation dialogs for sensitive actions.
                </p>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="font-medium">🗑️ Delete</span>
                            <p className="text-sm text-gray-500">Confirm before deleting items</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.confirmations.delete}
                                onChange={() => handleToggle('delete')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="font-medium">📤 Publish</span>
                            <p className="text-sm text-gray-500">Confirm before publishing</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.confirmations.publish}
                                onChange={() => handleToggle('publish')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <span className="font-medium">📦 Archive</span>
                            <p className="text-sm text-gray-500">Confirm before archiving</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.confirmations.archive}
                                onChange={() => handleToggle('archive')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between py-3">
                        <div>
                            <span className="font-medium">✏️ Update</span>
                            <p className="text-sm text-gray-500">Confirm before updating</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.confirmations.update}
                                onChange={() => handleToggle('update')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-6 w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-2">
                    Academic Labels
                </h2>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Customize academic terminology used throughout the system.
                </p>

                <div className="space-y-4">
                    {Object.entries(DEFAULT_ACADEMIC_LABELS).map(([key, defaultLabel]) => (
                        <div
                            key={key}
                            className="flex items-center justify-between gap-6"
                        >
                            <label className="font-medium capitalize w-48">
                                {defaultLabel}
                            </label>

                            <input
                                type="text"
                                value={settings.academicLabels[key] || ""}
                                onChange={(e) =>
                                    handleLabelChange(key, e.target.value)
                                }
                                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
                            />
                        </div>
                    ))}
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-6 w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                    {saving ? "Saving..." : "Save Academic Labels"}
                </button>
            </div>
        </div>
    );
};

export default Settings;