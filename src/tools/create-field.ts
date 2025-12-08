import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {tableId} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	field: z.record(z.string(), z.unknown()),
});

export function registerCreateField(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'create_field',
		{
			title: 'Create Field',
			description: 'Create a new field in a table',
			inputSchema: {
				...tableId,
				nested: z.object({
					field: z.record(z.string(), z.unknown()).describe('Field definition'),
				}),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const field = await ctx.airtableService.createField(
				args.baseId,
				args.tableId,
				args.nested.field as {name: string; type: string},
			);
			return jsonResult(outputSchema.parse({field}));
		},
	);
}
