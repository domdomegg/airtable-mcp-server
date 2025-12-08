import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {tableId} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	id: z.string(),
	fields: z.record(z.string(), z.unknown()),
});

export function registerCreateRecord(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'create_record',
		{
			title: 'Create Record',
			description: 'Create a new record in a table',
			inputSchema: {
				...tableId,
				fields: z.record(z.string(), z.unknown()).describe('The fields for the new record'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const record = await ctx.airtableService.createRecord(args.baseId, args.tableId, args.fields);
			return jsonResult(outputSchema.parse({id: record.id, fields: record.fields}));
		},
	);
}
