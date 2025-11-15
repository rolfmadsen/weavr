// This file now follows the modern, module-based approach for GUN.js in Vite.

// 1. Import the main Gun constructor.
import Gun from 'gun/gun';

// 2. Import the storage adapters for their side-effects.
// These imports attach the RAD/IndexedDB storage engine to the Gun constructor.
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed';

// 3. Create a single, configured Gun instance for the entire application.
// The `localStorage: false` option is critical to ensure the IndexedDB adapter is used.
const gun = Gun({
  peers: [`${window.location.origin}/gun`],
  localStorage: false, 
});

// 4. Expose the instance through a service object.
const gunService = {
  /**
   * Gets the root graph for a specific model.
   * All nodes and links for a model will be stored under this graph.
   * @param modelId The unique ID of the model.
   * @returns A GUN graph reference for the model.
   */
  getModel(modelId: string) {
    if (!modelId) {
      throw new Error("Model ID cannot be null or empty.");
    }
    // All models are stored under a root key to keep data organized.
    return gun.get(`event-model-weaver/${modelId}`);
  }
};

export default gunService;
