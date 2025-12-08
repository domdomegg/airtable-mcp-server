import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {recordId} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	comment: z.object({
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
	}),
});

export function registerCreateComment(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'create_comment',
		{
			title: 'Create Comment',
			description: 'Create a comment on a record',
			inputSchema: {
				...recordId,
				text: z.string().describe('The comment text'),
				parentCommentId: z.string().optional().describe('Optional parent comment ID for threaded replies'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
			},
		},
		async (args) => {
			const comment = await ctx.airtableService.createComment(
				args.baseId,
				args.tableId,
				args.recordId,
				args.text,
				args.parentCommentId,
			);
			return jsonResult(outputSchema.parse({comment}));
		},
	);
}
