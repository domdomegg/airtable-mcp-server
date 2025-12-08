import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {recordId} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	id: z.string(),
	fields: z.record(z.string(), z.unknown()),
});

export function registerGetRecord(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'get_record',
		{
			title: 'Get Record',
			description: 'Get a specific record by ID',
			inputSchema: recordId,
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const record = await ctx.airtableService.getRecord(args.baseId, args.tableId, args.recordId);
			return jsonResult(outputSchema.parse({id: record.id, fields: record.fields}));
		},
	);
}
