import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {recordId} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	comments: z.array(z.object({
		id: z.string(),
		createdTime: z.string(),
		lastUpdatedTime: z.string().nullable(),
		text: z.string(),
		author: z.object({
			id: z.string(),
			email: z.string(),
			name: z.string().optional(),
		}),
		parentCommentId: z.string().optional(),
	})),
	offset: z.string().nullable(),
});

export function registerListComments(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'list_comments',
		{
			title: 'List Comments',
			description: 'List comments on a record',
			inputSchema: {
				...recordId,
				pageSize: z.number().optional().describe('Number of comments to return (max 100, default 100)'),
				offset: z.string().optional().describe('Offset for pagination'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async (args) => {
			const response = await ctx.airtableService.listComments(
				args.baseId,
				args.tableId,
				args.recordId,
				args.pageSize,
				args.offset,
			);
			return jsonResult(outputSchema.parse(response));
		},
	);
}
