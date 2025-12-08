import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {baseId, detailLevel} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	tables: z.array(z.record(z.string(), z.unknown())),
});

export function registerListTables(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'list_tables',
		{
			title: 'List Tables',
			description: 'List all tables in a specific base',
			inputSchema: {
				...baseId,
				detailLevel: detailLevel.optional().default('full'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const schema = await ctx.airtableService.getBaseSchema(args.baseId);
			const result = schema.tables.map((table) => {
				if (args.detailLevel === 'tableIdentifiersOnly') {
					return {
						id: table.id,
						name: table.name,
					};
				}

				if (args.detailLevel === 'identifiersOnly') {
					return {
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
				}

				return {
					id: table.id,
					name: table.name,
					description: table.description,
					fields: table.fields,
					views: table.views,
				};
			});
			return jsonResult(outputSchema.parse({tables: result}));
		},
	);
}
