import {ResourceTemplate} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {IAirtableService} from '../types.js';

export function registerResources(server: McpServer, airtableService: IAirtableService): void {
	const template = new ResourceTemplate(
		'airtable://{baseId}/{tableId}/schema',
		{
			async list() {
				const {bases} = await airtableService.listBases();
				const resources = await Promise.all(bases.map(async (base) => {
					const schema = await airtableService.getBaseSchema(base.id);
					return schema.tables.map((table) => ({
						uri: `airtable://${base.id}/${table.id}/schema`,
						mimeType: 'application/json',
						name: `${base.name}: ${table.name} schema`,
					}));
				}));

				return {
					resources: resources.flat(),
				};
			},
		},
	);

	server.registerResource(
		'airtable-schema',
		template,
		{
			mimeType: 'application/json',
			description: 'Table schemas from Airtable bases',
		},
		async (uri, variables) => {
			const baseId = Array.isArray(variables.baseId) ? variables.baseId[0] : variables.baseId;
			const tableId = Array.isArray(variables.tableId) ? variables.tableId[0] : variables.tableId;

			if (!baseId || !tableId) {
				throw new Error('Invalid resource URI: missing baseId or tableId');
			}

			const schema = await airtableService.getBaseSchema(baseId);
			const table = schema.tables.find((t) => t.id === tableId);

			if (!table) {
				throw new Error(`Table ${tableId} not found in base ${baseId}`);
			}

			return {
				contents: [
					{
						uri: uri.toString(),
						mimeType: 'application/json',
						text: JSON.stringify({
							baseId,
							tableId: table.id,
							name: table.name,
							description: table.description,
							primaryFieldId: table.primaryFieldId,
							fields: table.fields,
							views: table.views,
						}),
					},
				],
			};
		},
	);
}
