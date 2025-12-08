import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {baseId} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	table: z.record(z.string(), z.unknown()),
});

export function registerCreateTable(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'create_table',
		{
			title: 'Create Table',
			description: 'Create a new table in a base',
			inputSchema: {
				...baseId,
				name: z.string().describe('The name of the table'),
				fields: z.array(z.record(z.string(), z.unknown())).describe('Array of field definitions'),
				description: z.string().optional().describe('Optional description for the table'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const table = await ctx.airtableService.createTable(
				args.baseId,
				args.name,
				args.fields as {name: string; type: string}[],
				args.description,
			);
			return jsonResult(outputSchema.parse({table}));
		},
	);
}
