import Gun from 'gun/gun';

// Type definition for GUN instance is notoriously tricky; using 'any' is common practice.
class GunService {
  private gun: any;

  constructor() {
    // Connect to the GUN relay hosted on the same server as the web app.
    // This makes the connection self-contained and reliable.
    this.gun = Gun({
      peers: [window.location.origin + '/gun']
    });
  }

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
    return this.gun.get(`event-model-weaver/${modelId}`);
  }
}

// Export a singleton instance.
const gunService = new GunService();
export default gunService;