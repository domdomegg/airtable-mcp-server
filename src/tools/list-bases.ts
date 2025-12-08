import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	bases: z.array(z.object({
		id: z.string(),
		name: z.string(),
		permissionLevel: z.string(),
	})),
});

export function registerListBases(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'list_bases',
		{
			title: 'List Bases',
			description: 'List all accessible Airtable bases',
			inputSchema: {},
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async () => {
			const {bases} = await ctx.airtableService.listBases();
			const result = bases.map((base) => ({
				id: base.id,
				name: base.name,
				permissionLevel: base.permissionLevel,
			}));
			return jsonResult(outputSchema.parse({bases: result}));
		},
	);
}
