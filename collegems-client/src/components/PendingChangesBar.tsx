import React, { useState } from 'react';
import { Save, X, List, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { usePendingChanges, type PendingChange } from '../context/PendingChangesContext';

interface Props {
  onCommit: (changes: PendingChange[]) => Promise<void>;
}

export default function PendingChangesBar({ onCommit }: Props) {
  const { changes, removeChange, clearChanges, commitChanges, isCommitting } = usePendingChanges();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (changes.length === 0 && !isOpen) return null;

  const handleCommit = async () => {
    setError(null);
    try {
      await commitChanges(onCommit);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to commit changes');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-80 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <List className="w-4 h-4 text-blue-600" />
              Pending Changes ({changes.length})
            </h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto p-4 space-y-3">
            {changes.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                No pending changes.
              </p>
            ) : (
              changes.map(change => (
                <div key={change.id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                        change.operation === 'CREATE' ? 'bg-green-100 text-green-700' :
                        change.operation === 'DELETE' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {change.operation}
                      </span>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                        {change.entityType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-200 line-clamp-2">
                      {change.description}
                    </p>
                  </div>
                  <button 
                    onClick={() => removeChange(change.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                    title="Remove change"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {error && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-t border-red-100 dark:border-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex gap-3">
            <button
              onClick={clearChanges}
              disabled={changes.length === 0 || isCommitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Discard All
            </button>
            <button
              onClick={handleCommit}
              disabled={changes.length === 0 || isCommitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-600/20"
            >
              {isCommitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Commit
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {!isOpen && changes.length > 0 && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 px-5 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all duration-200 animate-in slide-in-from-bottom-4 group"
        >
          <div className="relative">
            <Save className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-blue-600">
              {changes.length}
            </span>
          </div>
          <span className="font-medium pr-1">Review Pending Changes</span>
        </button>
      )}
    </div>
  );
}
