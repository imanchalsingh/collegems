import toast from 'react-hot-toast';

/**
 * Handles instant deletion with an Undo toast notification.
 * 
 * @param itemId The ID of the record to delete
 * @param deleteApiCall Function that calls your backend delete route
 * @param restoreApiCall Function that calls your restore.routes.js route
 * @param removeOptimistically Function to instantly remove the item from local React state
 * @param revertRemoval Function to put the item back in local React state if undone or failed
 */
export const handleDeleteWithUndo = async (
  itemId: string,
  deleteApiCall: (id: string) => Promise<any>,
  restoreApiCall: (id: string) => Promise<any>,
  removeOptimistically: (id: string) => void,
  revertRemoval: (id: string) => void
) => {
  // 1. INSTANT UI UPDATE: Remove from screen immediately
  removeOptimistically(itemId);

  try {
    // 2. Call backend to soft-delete
    await deleteApiCall(itemId);

    // 3. Show the Toast with the Undo button
    toast(
      (t) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>Record deleted.</span>
          <button
            onClick={async () => {
              toast.dismiss(t.id); // Hide this toast immediately
              
              try {
                // Call your existing restore route
                await restoreApiCall(itemId);
                // Put the item back on the screen
                revertRemoval(itemId);
                toast.success('Action undone successfully');
              } catch (restoreError) {
                toast.error('Failed to undo deletion');
              }
            }}
            style={{
              padding: '4px 10px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Undo
          </button>
        </div>
      ),
      { duration: 5000 } // Toast stays for 5 seconds to allow undo
    );
  } catch (error) {
    // If the initial delete failed, put the item back on screen and show error
    revertRemoval(itemId);
    toast.error('Failed to delete record');
  }
};