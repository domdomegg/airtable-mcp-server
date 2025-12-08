import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {tableId, detailLevel} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	table: z.record(z.string(), z.unknown()),
});

export function registerDescribeTable(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'describe_table',
		{
			title: 'Describe Table',
			description: 'Get detailed information about a specific table',
			inputSchema: {
				...tableId,
				detailLevel: detailLevel.optional().default('full'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const schema = await ctx.airtableService.getBaseSchema(args.baseId);
			const table = schema.tables.find((t) => t.id === args.tableId);

			if (!table) {
				throw new Error(`Table ${args.tableId} not found in base ${args.baseId}`);
			}

			let result;
			switch (args.detailLevel) {
				case 'tableIdentifiersOnly':
					result = {
						id: table.id,
						name: table.name,
					};
					break;
				case 'identifiersOnly':
					result = {
						id: table.id,
						name: table.name,
						fields: table.fields.map((field) => ({
							id: field.id,
							name: field.name,
						})),
						views: table.views.map((view) => ({
							id: view.id,
							name: view.name,
						})),
					};
					break;
				case 'full':
					result = {
						id: table.id,
						name: table.name,
						description: table.description,
						fields: table.fields,
						views: table.views,
					};
					break;
			}

			return jsonResult(outputSchema.parse({table: result}));
		},
	);
}
