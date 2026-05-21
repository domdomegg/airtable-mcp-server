import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {tableId} from './schemas.js';
import {jsonResult} from '../utils/response.js';

const outputSchema = z.object({
	field: z.record(z.string(), z.unknown()),
});

const choiceSchema = z.object({
	id: z
		.string()
		.optional()
		.describe('The ID of an existing choice. Include to retain or rename/recolor it; omit when creating a new choice.'),
	name: z.string().describe('The display name of the choice.'),
	color: z
		.string()
		.optional()
		.describe('The color of the choice (e.g. "blueLight2", "greenBright"). Optional when creating a new choice.'),
});

const updateFieldOptionsSchema = z
	.object({
		choices: z
			.array(choiceSchema)
			.optional()
			.describe(
				'For singleSelect / multipleSelects fields. Pass the full desired set of choices — '
				+ 'existing choices that are omitted will be deleted. Identify existing choices by their `id`; '
				+ 'new choices are created when no `id` is provided.',
			),
	})
	.describe('Field type-specific options. Currently `choices` is supported for singleSelect / multipleSelects fields.');

export function registerUpdateField(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'update_field',
		{
			title: 'Update Field',
			description: 'Update a field\'s name, description, or type-specific options (e.g. choices on singleSelect / multipleSelects)',
			inputSchema: {
				...tableId,
				fieldId: z.string().describe('The ID of the field'),
				name: z.string().optional().describe('New name for the field'),
				description: z.string().optional().describe('New description for the field'),
				options: updateFieldOptionsSchema.optional(),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
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
					options: args.options,
				},
			);
			return jsonResult(outputSchema.parse({field}));
		},
	);
}
