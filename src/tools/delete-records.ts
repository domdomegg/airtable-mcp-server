import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {tableId} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	records: z.array(z.object({
		id: z.string(),
	})),
});

export function registerDeleteRecords(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'delete_records',
		{
			title: 'Delete Records',
			description: 'Delete records from a table',
			inputSchema: {
				...tableId,
				recordIds: z.array(z.string()).describe('Array of record IDs to delete'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const records = await ctx.airtableService.deleteRecords(args.baseId, args.tableId, args.recordIds);
			const result = records.map((record) => ({id: record.id}));
			return jsonResult(outputSchema.parse({records: result}));
		},
	);
}
