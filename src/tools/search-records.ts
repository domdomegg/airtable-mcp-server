import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {tableId} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	records: z.array(z.object({
		id: z.string(),
		fields: z.record(z.string(), z.unknown()),
	})),
});

export function registerSearchRecords(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'search_records',
		{
			title: 'Search Records',
			description: 'Search for records containing specific text',
			inputSchema: {
				...tableId,
				searchTerm: z.string().describe('The text to search for'),
				fieldIds: z.array(z.string()).optional().describe('Optional array of field IDs to search in'),
				maxRecords: z.number().optional().describe('The maximum total number of records that will be returned'),
				view: z.string().optional().describe('The name or ID of a view in the table'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const records = await ctx.airtableService.searchRecords(
				args.baseId,
				args.tableId,
				args.searchTerm,
				args.fieldIds,
				args.maxRecords,
				args.view,
			);
			return jsonResult(outputSchema.parse({records}));
		},
	);
}
