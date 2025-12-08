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

export function registerUpdateRecords(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'update_records',
		{
			title: 'Update Records',
			description: 'Update up to 10 records in a table',
			inputSchema: {
				...tableId,
				records: z.array(z.object({
					id: z.string(),
					fields: z.record(z.string(), z.unknown()),
				})).describe('Array of records to update (max 10)'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const records = await ctx.airtableService.updateRecords(
				args.baseId,
				args.tableId,
				args.records.map((r) => ({id: r.id, fields: r.fields})),
			);
			const result = records.map((record) => ({
				id: record.id,
				fields: record.fields,
			}));
			return jsonResult(outputSchema.parse({records: result}));
		},
	);
}
