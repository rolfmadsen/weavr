// This file now follows the modern, module-based approach for GUN.js in Vite.

// 1. Import the main Gun constructor.
import Gun from 'gun/gun';

// 2. Import the storage adapters for their side-effects.
// These imports attach the RAD/IndexedDB storage engine to the Gun constructor.
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed';

// --- MONKEY PATCH START ---
// ADR: 0003-patch-gun-radix-corruption.md
// Prevent "TypeError: Cannot create property '' on number" when Radix encounters a primitive where an object is expected.
if (typeof window !== 'undefined' && (window as any).Radix) {
  const OriginalRadixMap = (window as any).Radix.map;
  let hasWarned = false;
  (window as any).Radix.map = function (radix: any, cb: any, opt: any, pre: any) {
    if (radix && typeof radix !== 'object' && typeof radix !== 'function') {
      if (!hasWarned) {
        console.warn('[GunDB Recovery] Encounted primitive in Radix tree branch. Ignoring to prevent crash (logging once only):', radix);
        hasWarned = true;
      }
      return;
    }
    return OriginalRadixMap(radix, cb, opt, pre);
  };
}
// --- MONKEY PATCH END ---

// 3. Create a single, configured Gun instance for the entire application.
// The `localStorage: false` option is critical to ensure the IndexedDB adapter is used.
const gun = Gun({
  peers: [typeof window !== 'undefined' ? window.location.origin + '/gun' : 'http://localhost:8080/gun'],
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
