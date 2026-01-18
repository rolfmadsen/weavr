// import { WeavrProject } from '../types';


export class DataDictionaryService {
    // private project: any; // Using any for now as WeavrProject might not have dataDictionary yet in types


    constructor() {
        // Initialize if needed
    }

    public upsertDefinition(project: any, key: string, definition: any) {
        if (!project.dataDictionary) {
            project.dataDictionary = { definitions: {} };
        }
        project.dataDictionary.definitions[key] = definition;
        return project;
    }

    public bindElement(project: any, elementId: string, schemaRef: string) {
        if (!project.schemaBindings) {
            project.schemaBindings = {};
        }
        project.schemaBindings[elementId] = { schemaRef };
        return project;
    }

    public getSchemaForElement(project: any, elementId: string) {
        const binding = project.schemaBindings?.[elementId];
        if (!binding) return null;
        return project.dataDictionary?.definitions?.[binding.schemaRef];
    }
}

const dataDictionaryService = new DataDictionaryService();
export default dataDictionaryService;
