import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import type {ToolContext} from './types.js';
import {baseId} from './schemas.js';
import {jsonResult} from '../utils/response.js';
import {AirtableRecordSchema} from '../types.js';

const outputSchema = AirtableRecordSchema;

export function registerUploadAttachment(server: McpServer, ctx: ToolContext): void {
	server.registerTool(
		'upload_attachment',
		{
			title: 'Upload Attachment',
			description:
				'Upload a file directly to an attachment field on an existing record using Airtable\'s upload API. Supports files up to 5 MB. For larger files, use create_record or update_records with a public URL. The record must already exist.',
			inputSchema: {
				...baseId,
				recordId: z.string().describe('The ID of the existing record (e.g. recXXXXXXXXXXXXXX)'),
				attachmentFieldIdOrName: z
					.string()
					.describe('The ID or name of the attachment field (e.g. fldXXXXXXXXXXXXXX or "Images")'),
				file: z.string().describe('Raw base64-encoded file content (no data URL prefix)'),
				filename: z.string().describe('Filename for the attachment (e.g. "image.jpg")'),
				contentType: z
					.string()
					.describe('MIME type of the file (e.g. "image/jpeg", "image/png", "application/pdf")'),
			},
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
			},
		},
		async (args) => {
			const record = await ctx.airtableService.uploadAttachment(
				args.baseId,
				args.recordId,
				args.attachmentFieldIdOrName,
				args.file,
				args.filename,
				args.contentType,
			);
			return jsonResult(outputSchema.parse({id: record.id, fields: record.fields}));
		},
	);
}
