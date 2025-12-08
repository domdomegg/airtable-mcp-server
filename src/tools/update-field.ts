import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {tableId} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	field: z.record(z.string(), z.unknown()),
});

export function registerUpdateField(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'update_field',
		{
			title: 'Update Field',
			description: 'Update a field\'s name or description',
			inputSchema: {
				...tableId,
				fieldId: z.string().describe('The ID of the field'),
				name: z.string().optional().describe('New name for the field'),
				description: z.string().optional().describe('New description for the field'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const field = await ctx.airtableService.updateField(
				args.baseId,
				args.tableId,
				args.fieldId,
				{
					name: args.name,
					description: args.description,
				},
			);
			return jsonResult(outputSchema.parse({field}));
		},
	);
}
