import {McpServer, ResourceTemplate} from '@modelcontextprotocol/sdk/server/mcp.js';
import {type Transport} from '@modelcontextprotocol/sdk/shared/transport.js';
import {z} from 'zod';
import {
	ListRecordsArgsSchema,
	ListTablesArgsSchema,
	DescribeTableArgsSchema,
	GetRecordArgsSchema,
	CreateRecordArgsSchema,
	UpdateRecordsArgsSchema,
	DeleteRecordsArgsSchema,
	CreateTableArgsSchema,
	UpdateTableArgsSchema,
	CreateFieldArgsSchema,
	UpdateFieldArgsSchema,
	SearchRecordsArgsSchema,
	type IAirtableService,
	type IAirtableMCPServer,
} from './types.js';

export class AirtableMCPServer implements IAirtableMCPServer {
	private readonly server: McpServer;

	constructor(private readonly airtableService: IAirtableService) {
		this.server = new McpServer({
			name: 'airtable-mcp-server',
			version: '0.1.0',
		});
		this.initializeHandlers();
	}

	async connect(transport: Transport): Promise<void> {
		await this.server.connect(transport);
	}

	async close(): Promise<void> {
		await this.server.close();
	}

	private initializeHandlers(): void {
		this.registerResources();
		this.registerTools();
	}

	private registerResources(): void {
		const template = new ResourceTemplate(
			'airtable://{baseId}/{tableId}/schema',
			{
				list: async () => {
					const {bases} = await this.airtableService.listBases();
					const resources = await Promise.all(bases.map(async (base) => {
						const schema = await this.airtableService.getBaseSchema(base.id);
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

		this.server.registerResource(
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

				const schema = await this.airtableService.getBaseSchema(baseId);
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

	private registerTools(): void {
		this.server.registerTool(
			'list_records',
			{
				description: 'List records from a table',
				inputSchema: {
					baseId: z.string().describe('The ID of the base'),
					tableId: z.string().describe('The ID or name of the table'),
					view: z.string().optional().describe('The name or ID of a view in the table'),
					maxRecords: z.number().optional().describe('The maximum total number of records that will be returned'),
					filterByFormula: z.string().optional().describe('A formula used to filter records'),
					sort: z.array(z.object({
						field: z.string(),
						direction: z.enum(['asc', 'desc']).optional(),
					})).optional().describe('A list of sort objects that specifies how the records will be ordered'),
				},
			},
			async (args) => {
				const parsedArgs = ListRecordsArgsSchema.parse(args);
				const records = await this.airtableService.listRecords(
					parsedArgs.baseId,
					parsedArgs.tableId,
					{
						view: parsedArgs.view,
						maxRecords: parsedArgs.maxRecords,
						filterByFormula: parsedArgs.filterByFormula,
						sort: parsedArgs.sort,
					},
				);
				return {
					content: [{type: 'text', text: JSON.stringify(records)}],
				};
			},
		);

		this.server.registerTool(
			'search_records',
			{
				description: 'Search for records containing specific text',
				inputSchema: {
					baseId: z.string().describe('The ID of the base'),
					tableId: z.string().describe('The ID or name of the table'),
					searchTerm: z.string().describe('The text to search for'),
					fieldIds: z.array(z.string()).optional().describe('Optional array of field IDs to search in'),
					maxRecords: z.number().optional().describe('The maximum total number of records that will be returned'),
					view: z.string().optional().describe('The name or ID of a view in the table'),
				},
			},
			async (args) => {
				const parsedArgs = SearchRecordsArgsSchema.parse(args);
				const records = await this.airtableService.searchRecords(
					parsedArgs.baseId,
					parsedArgs.tableId,
					parsedArgs.searchTerm,
					parsedArgs.fieldIds,
					parsedArgs.maxRecords,
					parsedArgs.view,
				);
				return {
					content: [{type: 'text', text: JSON.stringify(records)}],
				};
			},
		);

		this.server.registerTool(
			'list_bases',
			{
				description: 'List all accessible Airtable bases',
				inputSchema: {},
			},
			async () => {
				const {bases} = await this.airtableService.listBases();
				const result = bases.map((base) => ({
					id: base.id,
					name: base.name,
					permissionLevel: base.permissionLevel,
				}));
				return {
					content: [{type: 'text', text: JSON.stringify(result)}],
				};
			},
		);

		this.server.registerTool(
			'list_tables',
			{
				description: 'List all tables in a specific base',
				inputSchema: {
					baseId: z.string().describe('The ID of the base'),
					detailLevel: z.enum(['tableIdentifiersOnly', 'identifiersOnly', 'full']).optional().default('full').describe('Level of detail to return'),
				},
			},
			async (args) => {
				const parsedArgs = ListTablesArgsSchema.parse(args);
				const schema = await this.airtableService.getBaseSchema(parsedArgs.baseId);
				const result = schema.tables.map((table) => {
					switch (parsedArgs.detailLevel) {
						case 'tableIdentifiersOnly':
							return {
								id: table.id,
								name: table.name,
							};
						case 'identifiersOnly':
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
						case 'full':
						// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check, no-fallthrough
						default:
							return {
								id: table.id,
								name: table.name,
								description: table.description,
								fields: table.fields,
								views: table.views,
							};
					}
				});
				return {
					content: [{type: 'text', text: JSON.stringify(result)}],
				};
			},
		);

		this.server.registerTool(
			'describe_table',
			{
				description: 'Get detailed information about a specific table',
				inputSchema: {
					baseId: z.string().describe('The ID of the base'),
					tableId: z.string().describe('The ID or name of the table'),
					detailLevel: z.enum(['tableIdentifiersOnly', 'identifiersOnly', 'full']).optional().default('full').describe('Level of detail to return'),
				},
			},
			async (args) => {
				const parsedArgs = DescribeTableArgsSchema.parse(args);
				const schema = await this.airtableService.getBaseSchema(parsedArgs.baseId);
				const table = schema.tables.find((t) => t.id === parsedArgs.tableId);

				if (!table) {
					throw new Error(`Table ${parsedArgs.tableId} not found in base ${parsedArgs.baseId}`);
				}

				let result;
				switch (parsedArgs.detailLevel) {
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
					// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check, no-fallthrough
					default:
						result = {
							id: table.id,
							name: table.name,
							description: table.description,
							fields: table.fields,
							views: table.views,
						};
						break;
				}

				return {
					content: [{type: 'text', text: JSON.stringify(result)}],
				};
			},
		);

		this.server.registerTool(
			'get_record',
			{
				description: 'Get a specific record by ID',
				inputSchema: {
					baseId: z.string().describe('The ID of the base'),
					tableId: z.string().describe('The ID or name of the table'),
					recordId: z.string().describe('The ID of the record'),
				},
			},
			async (args) => {
				const parsedArgs = GetRecordArgsSchema.parse(args);
				const record = await this.airtableService.getRecord(parsedArgs.baseId, parsedArgs.tableId, parsedArgs.recordId);
				return {
					content: [{type: 'text', text: JSON.stringify({id: record.id, fields: record.fields})}],
				};
			},
		);

		this.server.registerTool(
			'create_record',
			{
				description: 'Create a new record in a table',
				inputSchema: {
					baseId: z.string().describe('The ID of the base'),
					tableId: z.string().describe('The ID or name of the table'),
					fields: z.record(z.unknown()).describe('The fields for the new record'),
				},
			},
			async (args) => {
				const parsedArgs = CreateRecordArgsSchema.parse(args);
				const record = await this.airtableService.createRecord(parsedArgs.baseId, parsedArgs.tableId, parsedArgs.fields);
				return {
					content: [{type: 'text', text: JSON.stringify({id: record.id, fields: record.fields})}],
				};
			},
		);

		this.server.registerTool(
			'update_records',
			{
				description: 'Update up to 10 records in a table',
				inputSchema: {
					baseId: z.string().describe('The ID of the base'),
					tableId: z.string().describe('The ID or name of the table'),
					records: z.array(z.object({
						id: z.string(),
						fields: z.record(z.unknown()),
					})).describe('Array of records to update (max 10)'),
				},
			},
			async (args) => {
				const parsedArgs = UpdateRecordsArgsSchema.parse(args);
				const records = await this.airtableService.updateRecords(parsedArgs.baseId, parsedArgs.tableId, parsedArgs.records);
				const result = records.map((record) => ({
					id: record.id,
					fields: record.fields,
				}));
				return {
					content: [{type: 'text', text: JSON.stringify(result)}],
				};
			},
		);

		this.server.registerTool(
			'delete_records',
			{
				description: 'Delete records from a table',
				inputSchema: {
					baseId: z.string().describe('The ID of the base'),
					tableId: z.string().describe('The ID or name of the table'),
					recordIds: z.array(z.string()).describe('Array of record IDs to delete'),
				},
			},
			async (args) => {
				const parsedArgs = DeleteRecordsArgsSchema.parse(args);
				const records = await this.airtableService.deleteRecords(parsedArgs.baseId, parsedArgs.tableId, parsedArgs.recordIds);
				const result = records.map((record) => ({id: record.id}));
				return {
					content: [{type: 'text', text: JSON.stringify(result)}],
				};
			},
		);

		this.server.registerTool(
			'create_table',
			{
				description: 'Create a new table in a base',
				inputSchema: {
					baseId: z.string().describe('The ID of the base'),
					name: z.string().describe('The name of the table'),
					fields: z.array(z.record(z.unknown())).describe('Array of field definitions'),
					description: z.string().optional().describe('Optional description for the table'),
				},
			},
			async (args) => {
				const parsedArgs = CreateTableArgsSchema.parse(args);
				const table = await this.airtableService.createTable(
					parsedArgs.baseId,
					parsedArgs.name,
					parsedArgs.fields,
					parsedArgs.description,
				);
				return {
					content: [{type: 'text', text: JSON.stringify(table)}],
				};
			},
		);

		this.server.registerTool(
			'update_table',
			{
				description: 'Update a table\'s name or description',
				inputSchema: {
					baseId: z.string().describe('The ID of the base'),
					tableId: z.string().describe('The ID or name of the table'),
					name: z.string().optional().describe('New name for the table'),
					description: z.string().optional().describe('New description for the table'),
				},
			},
			async (args) => {
				const parsedArgs = UpdateTableArgsSchema.parse(args);
				const table = await this.airtableService.updateTable(
					parsedArgs.baseId,
					parsedArgs.tableId,
					{name: parsedArgs.name, description: parsedArgs.description},
				);
				return {
					content: [{type: 'text', text: JSON.stringify(table)}],
				};
			},
		);

		this.server.registerTool(
			'create_field',
			{
				description: 'Create a new field in a table',
				inputSchema: {
					baseId: z.string().describe('The ID of the base'),
					tableId: z.string().describe('The ID or name of the table'),
					nested: z.object({
						field: z.record(z.unknown()).describe('Field definition'),
					}),
				},
			},
			async (args) => {
				const parsedArgs = CreateFieldArgsSchema.parse(args);
				const field = await this.airtableService.createField(
					parsedArgs.baseId,
					parsedArgs.tableId,
					parsedArgs.nested.field,
				);
				return {
					content: [{type: 'text', text: JSON.stringify(field)}],
				};
			},
		);

		this.server.registerTool(
			'update_field',
			{
				description: 'Update a field\'s name or description',
				inputSchema: {
					baseId: z.string().describe('The ID of the base'),
					tableId: z.string().describe('The ID or name of the table'),
					fieldId: z.string().describe('The ID of the field'),
					name: z.string().optional().describe('New name for the field'),
					description: z.string().optional().describe('New description for the field'),
				},
			},
			async (args) => {
				const parsedArgs = UpdateFieldArgsSchema.parse(args);
				const field = await this.airtableService.updateField(
					parsedArgs.baseId,
					parsedArgs.tableId,
					parsedArgs.fieldId,
					{
						name: parsedArgs.name,
						description: parsedArgs.description,
					},
				);
				return {
					content: [{type: 'text', text: JSON.stringify(field)}],
				};
			},
		);
	}
}
