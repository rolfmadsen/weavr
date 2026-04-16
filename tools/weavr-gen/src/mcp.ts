import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { generateCore } from './commands/generate.js';
import { validateCore } from './commands/validate.js';
import { mergeCore } from './commands/merge.js';
import { detectGaps } from './diagnostics/gapDetector.js';
import { traceLineage } from './diagnostics/lineageTracer.js';
import type { WeavrProject, Slice, ModelingElement } from './types.js';

const server = new McpServer({
  name: 'weavr-gen',
  version: '1.0.0',
});

// ─── Resources ───────────────────────────────────────────────────

server.registerResource(
  'weavr_gen_rules',
  new ResourceTemplate('weavr-gen://rules/system-prompt', { list: undefined }),
  { description: 'Weavr Modeling Rules for AI interactions' },
  async (uri) => {
    const rules = `
# Weavr Modeling Rules
(This applies to MCP interactions)
- You must always follow the SCEP architecture.
- Every slice requires specifications.
- Use weavr_gen_generate to create verified schemas.
- Use weavr_gen_merge to append them to the local model.
    `;
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: rules,
        },
      ],
    };
  }
);

// ─── Tools ───────────────────────────────────────────────────────

server.registerTool(
  'weavr_gen_generate',
  {
    description: 'Generate a validated Event Modeling slice using the Weavr domain constraints',
    inputSchema: {
      pattern: z.enum(['STATE_CHANGE', 'STATE_VIEW', 'AUTOMATION', 'INTEGRATION']),
      title: z.string(),
      aggregate: z.string().optional(),
      actor: z.string().optional(),
      fields: z.string().optional().describe('Comma-separated name:Type pairs'),
      externalSystem: z.string().optional(),
      direction: z.enum(['INBOUND', 'OUTBOUND']).optional(),
      sourceEvent: z.string().optional().describe('ID of trigger/source event'),
      specExamples: z.string().optional().describe('Pipe-separated rows, comma-separated headers (e.g. hdr1,hdr2|val1,val2)'),
      specComments: z.string().optional(),
      modelData: z.string().optional().describe('JSON string of existing WeavrProject for context'),
    }
  },
  async (args) => {
    try {
      const modelData = args.modelData ? JSON.parse(args.modelData) : undefined;
      const slice = generateCore({
        pattern: args.pattern as any,
        title: args.title,
        aggregate: args.aggregate,
        actor: args.actor,
        fields: args.fields,
        externalSystem: args.externalSystem,
        direction: args.direction as any,
        sourceEvent: args.sourceEvent,
        specExamples: args.specExamples,
        specComments: args.specComments,
        skipValidation: false,
        modelData,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(slice, null, 2) }],
      };
    } catch (error: any) {
      let msg = error.message;
      if (error.validationResult) {
        msg += '\n\nValidation Details: ' + JSON.stringify(error.validationResult, null, 2);
      }
      return {
        content: [{ type: 'text', text: `Error: ${msg}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'weavr_gen_bridge',
  {
    description: 'Create a Bridge Slice: A Read Model projection of an Event from another slice',
    inputSchema: {
      title: z.string().describe('Title of the bridge slice'),
      sourceEventId: z.string().describe('ID of the Domain Event to project'),
      modelData: z.string().describe('JSON string of existing WeavrProject'),
      fields: z.string().optional().describe('Comma-separated name:Type pairs to include in the Read Model'),
    }
  },
  async (args) => {
    try {
      const modelData = JSON.parse(args.modelData);
      const slice = generateCore({
        pattern: 'STATE_VIEW',
        title: args.title,
        sourceEvent: args.sourceEventId,
        fields: args.fields,
        modelData,
        skipValidation: false,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(slice, null, 2) }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'weavr_gen_thread',
  {
    description: 'Connect functional slices via Automation: Link an Event from one slice to a Command in another',
    inputSchema: {
      title: z.string().describe('Title of the thread/automation slice'),
      triggerEventId: z.string().describe('ID of the Source Event'),
      targetCommandTitle: z.string().describe('Title of the Command to issue'),
      aggregate: z.string().optional().describe('Target Aggregate root'),
      modelData: z.string().describe('JSON string of existing WeavrProject'),
      fields: z.string().optional().describe('Comma-separated fields to pass through'),
    }
  },
  async (args) => {
    try {
      const modelData = JSON.parse(args.modelData);
      const slice = generateCore({
        pattern: 'AUTOMATION',
        title: args.title,
        sourceEvent: args.triggerEventId,
        aggregate: args.aggregate,
        fields: args.fields,
        modelData,
        skipValidation: false,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(slice, null, 2) }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'weavr_gen_diff',
  {
    description: 'Visualize structural changes between a project and a slice before merging',
    inputSchema: {
      modelData: z.string().describe('JSON string of existing WeavrProject'),
      sliceData: z.string().describe('JSON string of Slice to preview'),
    }
  },
  async (args) => {
    try {
      const model = JSON.parse(args.modelData) as WeavrProject;
      const slice = JSON.parse(args.sliceData) as Slice;
      
      const added: string[] = [];
      const modified: string[] = [];

      const checkElement = (el: ModelingElement) => {
        const existing = model.eventModel.slices.flatMap(s => [
          ...s.commands, ...s.events, ...s.readmodels, ...s.screens
        ]).find(e => e.id === el.id);

        if (existing) {
          modified.push(`${el.type}: ${el.title} (${el.id})`);
        } else {
          added.push(`${el.type}: ${el.title} (${el.id})`);
        }
      };

      slice.commands.forEach(checkElement);
      slice.events.forEach(checkElement);
      slice.readmodels.forEach(checkElement);
      slice.screens.forEach(checkElement);

      const diff = [
        `### Diff Preview for Slice: ${slice.title}`,
        '',
        '#### 🟢 Added',
        ...added.map(a => `- ${a}`),
        added.length === 0 ? '- None' : '',
        '',
        '#### 🟡 Modified',
        ...modified.map(m => `- ${m}`),
        modified.length === 0 ? '- None' : '',
      ].filter(l => l !== '').join('\n');

      return {
        content: [{ type: 'text', text: diff }],
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error generating diff: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'weavr_gen_validate',
  {
    description: 'Validate a Weavr slice or project against all constraints',
    inputSchema: {
      data: z.string().describe('JSON string of Slice or WeavrProject'),
      full: z.boolean().optional().describe('Force validation as full project'),
    }
  },
  async (args) => {
    try {
      const data = JSON.parse(args.data);
      const result = validateCore(data, args.full);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: !result.valid,
      };
    } catch (e: any) {
      return {
        content: [{ type: 'text', text: `Error processing validation: ${e.message}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'weavr_gen_merge',
  {
    description: 'Merge a generated slice into an existing Weavr project',
    inputSchema: {
      modelData: z.string().describe('JSON string of existing WeavrProject'),
      sliceData: z.string().describe('JSON string of Slice to merge'),
      overwrite: z.boolean().optional().describe('Set to true to overwrite existing slice with same ID (e.g. when refining)'),
    }
  },
  async (args) => {
    try {
      const model = JSON.parse(args.modelData) as WeavrProject;
      const slice = JSON.parse(args.sliceData) as Slice;
      const result = mergeCore(model, slice, !!args.overwrite);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      let msg = error.message;
      if (error.validationResult) {
        msg += '\n\nValidation Details: ' + JSON.stringify(error.validationResult, null, 2);
      }
      return {
        content: [{ type: 'text', text: `Error: ${msg}` }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'weavr_gen_start_session',
  {
    description: 'Create a brand new Weavr project skeleton',
    inputSchema: {
      projectName: z.string().optional().describe('Name of the project'),
    }
  },
  async (args) => {
    const projectName = args.projectName || 'Untitled Project';
    const newModel: WeavrProject = {
      meta: {
        version: '1.0',
        generator: 'Weavr',
        updatedAt: new Date().toISOString(),
        projectName
      },
      eventModel: { slices: [] },
      dataDictionary: { definitions: {} }
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(newModel, null, 2) }],
    };
  }
);

server.registerTool(
  'weavr_gen_diagnostics',
  {
    description: 'Analyze an entire Weavr project to detect structural gaps and broken lineage',
    inputSchema: {
      modelData: z.string().describe('JSON string of existing WeavrProject'),
    }
  },
  async (args) => {
    try {
      const model = JSON.parse(args.modelData) as WeavrProject;
      const gaps = detectGaps(model);
      const lineage = traceLineage(model);
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({ gaps, lineage }, null, 2) 
        }],
      };
    } catch (e: any) {
      return {
        content: [{ type: 'text', text: `Error running diagnostics: ${e.message}` }],
        isError: true,
      };
    }
  }
);

// ─── Startup ─────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Weavr-Gen MCP Server connected via stdio (McpServer Wrapper)');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
