import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ChangeOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface PendingChange {
  id: string; // Unique ID for the queue item
  entityType: string; // e.g., 'Student', 'Course'
  entityId?: string; // Optional if CREATE
  operation: ChangeOperation;
  payload: any;
  description: string; // User-friendly description of the change
  timestamp: number;
}

interface PendingChangesContextType {
  changes: PendingChange[];
  addChange: (change: Omit<PendingChange, 'id' | 'timestamp'>) => void;
  removeChange: (id: string) => void;
  clearChanges: () => void;
  commitChanges: (executeBatch: (changes: PendingChange[]) => Promise<void>) => Promise<void>;
  isCommitting: boolean;
}

const PendingChangesContext = createContext<PendingChangesContextType | undefined>(undefined);

export const PendingChangesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [changes, setChanges] = useState<PendingChange[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);

  const addChange = useCallback((change: Omit<PendingChange, 'id' | 'timestamp'>) => {
    const newChange: PendingChange = {
      ...change,
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    setChanges(prev => [...prev, newChange]);
  }, []);

  const removeChange = useCallback((id: string) => {
    setChanges(prev => prev.filter(c => c.id !== id));
  }, []);

  const clearChanges = useCallback(() => {
    setChanges([]);
  }, []);

  const commitChanges = useCallback(async (executeBatch: (changes: PendingChange[]) => Promise<void>) => {
    if (changes.length === 0) return;
    
    setIsCommitting(true);
    try {
      await executeBatch(changes);
      setChanges([]); // Clear on success
    } catch (error) {
      console.error('Failed to commit pending changes:', error);
      throw error;
    } finally {
      setIsCommitting(false);
    }
  }, [changes]);

  return (
    <PendingChangesContext.Provider value={{
      changes,
      addChange,
      removeChange,
      clearChanges,
      commitChanges,
      isCommitting
    }}>
      {children}
    </PendingChangesContext.Provider>
  );
};

export const usePendingChanges = () => {
  const context = useContext(PendingChangesContext);
  if (context === undefined) {
    throw new Error('usePendingChanges must be used within a PendingChangesProvider');
  }
  return context;
};
