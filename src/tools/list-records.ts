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

export function registerListRecords(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'list_records',
		{
			title: 'List Records',
			description: 'List records from a table',
			inputSchema: {
				...tableId,
				view: z.string().optional().describe('The name or ID of a view in the table'),
				maxRecords: z.number().optional().describe('The maximum total number of records that will be returned'),
				filterByFormula: z.string().optional().describe('A formula used to filter records'),
				sort: z.array(z.object({
					field: z.string(),
					direction: z.enum(['asc', 'desc']).optional(),
				})).optional().describe('A list of sort objects that specifies how the records will be ordered'),
				fields: z.array(z.string()).optional().describe('An array of field names or IDs to include in the response. Omit this to return all fields, which is usually what you want. Only set it if the table has many fields and you don\'t need most of them, AND you already know the exact field names or IDs (e.g. from describe_table) - guessing them will silently return the wrong data.'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const records = await ctx.airtableService.listRecords(
				args.baseId,
				args.tableId,
				{
					view: args.view,
					maxRecords: args.maxRecords,
					filterByFormula: args.filterByFormula,
					sort: args.sort,
					fields: args.fields,
				},
			);
			return jsonResult(outputSchema.parse({records}));
		},
	);
}
