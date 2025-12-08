import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {tableId} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	table: z.record(z.string(), z.unknown()),
});

export function registerUpdateTable(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'update_table',
		{
			title: 'Update Table',
			description: 'Update a table\'s name or description',
			inputSchema: {
				...tableId,
				name: z.string().optional().describe('New name for the table'),
				description: z.string().optional().describe('New description for the table'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const table = await ctx.airtableService.updateTable(
				args.baseId,
				args.tableId,
				{name: args.name, description: args.description},
			);
			return jsonResult(outputSchema.parse({table}));
		},
	);
}
