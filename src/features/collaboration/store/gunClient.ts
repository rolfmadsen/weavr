// This file now follows the modern, module-based approach for GUN.js in Vite.

// 1. Import the main Gun constructor.
import Gun from 'gun/gun';

// 2. Import the storage adapters for their side-effects.
// These imports attach the RAD/IndexedDB storage engine to the Gun constructor.
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed';

// Prevent "TypeError: Cannot create property '' on number" when Radix encounters a primitive where an object is expected.
if (typeof window !== 'undefined' && (window as any).Radix) {
  // Full replacement of Radix.map to handle recursive calls and internal primitive errors
  // Original Source: gun/lib/radix.js
  const _ = String.fromCharCode(24);
  (window as any).Radix.map = function rap(radix: any, cb: any, opt: any, pre: any): any {
    try {
      pre = pre || [];
      var t = ('function' == typeof radix) ? (radix as any).$ || {} : radix;

      if (t && typeof t !== 'object' && typeof t !== 'function' && typeof t !== 'string') {
        // console.warn("Primitive found in Radix Map, ignoring:", t);
        return;
      }

      if (!t) { return }
      if ('string' == typeof t) { return; }

      // Cache sorting if needed (original implementation)
      // @ts-ignore
      var keys = (t[_] || {}).sort || (t[_] = function $() {
        // @ts-ignore
        ($ as any).sort = Object.keys(t).sort(); return $
      }() as any).sort;

      var rev;
      opt = (true === opt) ? { branch: true } : (opt || {});
      if (rev = opt.reverse) { keys = keys.slice(0).reverse() }

      var start = opt.start, end = opt.end, END = '\uffff';
      var i = 0, l = keys.length;

      for (; i < l; i++) {
        var key = keys[i], tree = t[key], tmp, p, pt;
        if (!tree || '' === key || _ === key || 'undefined' === key) { continue }

        p = pre.slice(0); p.push(key);
        pt = p.join('');

        if (undefined !== start && pt < (start || '').slice(0, pt.length)) { continue }
        if (undefined !== end && (end || END) < pt) { continue }

        if (rev) {
          // Recursive Call (Uses 'rap' reference)
          tmp = rap(tree, cb, opt, p);
          if (undefined !== tmp) { return tmp }
        }

        if (undefined !== (tmp = tree[''])) {
          var yes = 1;
          if (undefined !== start && pt < (start || '')) { yes = 0 }
          if (undefined !== end && pt > (end || END)) { yes = 0 }
          if (yes) {
            tmp = cb(tmp, pt, key, pre);
            if (undefined !== tmp) { return tmp }
          }
        } else if (opt.branch) {
          tmp = cb(undefined, pt, key, pre);
          if (undefined !== tmp) { return tmp }
        }

        pre = p;
        if (!rev) {
          // Recursive Call (Uses 'rap' reference)
          tmp = rap(tree, cb, opt, pre);
          if (undefined !== tmp) { return tmp }
        }
        pre.pop();
      }
    } catch (e) { console.error(e); }
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
