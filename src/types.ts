import {type Transport} from '@modelcontextprotocol/sdk/shared/transport.js';
import {z} from 'zod';

// Zod schemas for API responses
export const BaseSchema = z.object({
	id: z.string(),
	name: z.string(),
	permissionLevel: z.string(),
});

export const ListBasesResponseSchema = z.object({
	bases: z.array(BaseSchema),
	offset: z.string().optional(),
});

export const FieldOptionsSchema = z.object({
	isReversed: z.boolean().optional(),
	inverseLinkFieldId: z.string().optional(),
	linkedTableId: z.string().optional(),
	prefersSingleRecordLink: z.boolean().optional(),
	color: z.string().optional(),
	icon: z.string().optional(),
}).passthrough();

export const FieldSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
// Extracted from Airtable API docs
}).and(z.union([
	z.object({type: z.literal('autoNumber')}),
	z.object({type: z.literal('barcode')}),
	z.object({type: z.literal('button')}),
	z
		.object({
			options: z.object({
				color: z
					.enum([
						'greenBright',
						'tealBright',
						'cyanBright',
						'blueBright',
						'purpleBright',
						'pinkBright',
						'redBright',
						'orangeBright',
						'yellowBright',
						'grayBright',
					])
					.describe('The color of the checkbox.'),
				icon: z
					.enum([
						'check',
						'xCheckbox',
						'star',
						'heart',
						'thumbsUp',
						'flag',
						'dot',
					])
					.describe('The icon name of the checkbox.'),
			}),
			type: z.literal('checkbox'),
		})
		.describe('Bases on a free or plus plan are limited to using the `\'check\'` icon and `\'greenBright\'` color.'),
	z.object({type: z.literal('createdBy')}),
	z.object({
		options: z.object({
			result: z
				.union([
					z.object({
						options: z.object({
							dateFormat: z.object({
								format: z
									.enum(['l', 'LL', 'M/D/YYYY', 'D/M/YYYY', 'YYYY-MM-DD'])
									.describe('`format` is always provided when reading.\n(`l` for local, `LL` for friendly, `M/D/YYYY` for us, `D/M/YYYY` for european, `YYYY-MM-DD` for iso)'),
								name: z.enum(['local', 'friendly', 'us', 'european', 'iso']),
							}),
						}),
						type: z.literal('date'),
					}),
					z.object({
						options: z.object({
							dateFormat: z.object({
								format: z
									.enum(['l', 'LL', 'M/D/YYYY', 'D/M/YYYY', 'YYYY-MM-DD'])
									.describe('`format` is always provided when reading.\n(`l` for local, `LL` for friendly, `M/D/YYYY` for us, `D/M/YYYY` for european, `YYYY-MM-DD` for iso)'),
								name: z.enum(['local', 'friendly', 'us', 'european', 'iso']),
							}),
							timeFormat: z.object({
								format: z.enum(['h:mma', 'HH:mm']),
								name: z.enum(['12hour', '24hour']),
							}),
							timeZone: z.any(),
						}),
						type: z.literal('dateTime'),
					}),
				])
				.describe('This will always be a `date` or `dateTime` field config.')
				.optional(),
		}),
		type: z.literal('createdTime'),
	}),
	z.object({
		options: z.object({
			isValid: z
				.boolean()
				.describe('`false` when recordLinkFieldId is null, e.g. the referenced column was deleted.'),
			recordLinkFieldId: z.union([z.string(), z.null()]).optional(),
		}),
		type: z.literal('count'),
	}),
	z.any(),
	z.object({
		options: z.object({
			isValid: z
				.boolean()
				.describe('False if this formula/field configuation has an error'),
			referencedFieldIds: z
				.union([z.array(z.string()), z.null()])
				.describe('The fields to check the last modified time of'),
			result: z
				.union([
					z.object({
						options: z.object({
							dateFormat: z.object({
								format: z
									.enum(['l', 'LL', 'M/D/YYYY', 'D/M/YYYY', 'YYYY-MM-DD'])
									.describe('`format` is always provided when reading.\n(`l` for local, `LL` for friendly, `M/D/YYYY` for us, `D/M/YYYY` for european, `YYYY-MM-DD` for iso)'),
								name: z.enum(['local', 'friendly', 'us', 'european', 'iso']),
							}),
						}),
						type: z.literal('date'),
					}),
					z.object({
						options: z.object({
							dateFormat: z.object({
								format: z
									.enum(['l', 'LL', 'M/D/YYYY', 'D/M/YYYY', 'YYYY-MM-DD'])
									.describe('`format` is always provided when reading.\n(`l` for local, `LL` for friendly, `M/D/YYYY` for us, `D/M/YYYY` for european, `YYYY-MM-DD` for iso)'),
								name: z.enum(['local', 'friendly', 'us', 'european', 'iso']),
							}),
							timeFormat: z.object({
								format: z.enum(['h:mma', 'HH:mm']),
								name: z.enum(['12hour', '24hour']),
							}),
							timeZone: z.any(),
						}),
						type: z.literal('dateTime'),
					}),
					z.null(),
				])
				.describe('This will always be a `date` or `dateTime` field config.'),
		}),
		type: z.literal('lastModifiedTime'),
	}),
	z.object({type: z.literal('lastModifiedBy')}),
	z.object({
		options: z.object({
			fieldIdInLinkedTable: z
				.union([z.string(), z.null()])
				.describe('The field in the linked table that this field is looking up.'),
			isValid: z
				.boolean()
				.describe('Is the field currently valid (e.g. false if the linked record field has\nbeen deleted)'),
			recordLinkFieldId: z
				.union([z.string(), z.null()])
				.describe('The linked record field in the current table.'),
			result: z
				.union([z.any(), z.null()])
				.describe('The field type and options inside of the linked table. See other field\ntype configs on this page for the possible values. Can be null if invalid.'),
		}),
		type: z.literal('lookup'),
	}),
	z.object({
		options: z.object({
			precision: z
				.number()
				.describe('Indicates the number of digits shown to the right of the decimal point for this field. (0-8 inclusive)'),
		}),
		type: z.literal('number'),
	}),
	z.object({
		options: z.object({
			precision: z
				.number()
				.describe('Indicates the number of digits shown to the right of the decimal point for this field. (0-8 inclusive)'),
		}),
		type: z.literal('percent'),
	}),
	z.object({
		options: z.object({
			precision: z
				.number()
				.describe('Indicates the number of digits shown to the right of the decimal point for this field. (0-7 inclusive)'),
			symbol: z.string().describe('Currency symbol to use.'),
		}),
		type: z.literal('currency'),
	}),
	z.object({
		options: z.object({
			durationFormat: z.enum([
				'h:mm',
				'h:mm:ss',
				'h:mm:ss.S',
				'h:mm:ss.SS',
				'h:mm:ss.SSS',
			]),
		}),
		type: z.literal('duration'),
	}),
	z.object({type: z.literal('multilineText')}),
	z.object({type: z.literal('phoneNumber')}),
	z
		.object({
			options: z.object({
				color: z
					.enum([
						'yellowBright',
						'orangeBright',
						'redBright',
						'pinkBright',
						'purpleBright',
						'blueBright',
						'cyanBright',
						'tealBright',
						'greenBright',
						'grayBright',
					])
					.describe('The color of selected icons.'),
				icon: z
					.enum(['star', 'heart', 'thumbsUp', 'flag', 'dot'])
					.describe('The icon name used to display the rating.'),
				max: z
					.number()
					.describe('The maximum value for the rating, from 1 to 10 inclusive.'),
			}),
			type: z.literal('rating'),
		})
		.describe('Bases on a free or plus plan are limited to using the \'star\' icon and \'yellowBright\' color.'),
	z.object({type: z.literal('richText')}),
	z.object({
		options: z.object({
			fieldIdInLinkedTable: z
				.string()
				.describe('The id of the field in the linked table')
				.optional(),
			isValid: z.boolean().optional(),
			recordLinkFieldId: z.string().describe('The linked field id').optional(),
			referencedFieldIds: z
				.array(z.string())
				.describe('The ids of any fields referenced in the rollup formula')
				.optional(),
			result: z
				.union([z.any(), z.null()])
				.describe('The resulting field type and options for the rollup. See other field\ntype configs on this page for the possible values. Can be null if invalid.')
				.optional(),
		}),
		type: z.literal('rollup'),
	}),
	z.object({type: z.literal('singleLineText')}),
	z.object({type: z.literal('email')}),
	z.object({type: z.literal('url')}),
	z.object({
		options: z.object({
			choices: z.array(z.object({
				color: z
					.string()
					.describe('Optional when the select field is configured to not use colors.\n\nAllowed values: "blueLight2", "cyanLight2", "tealLight2", "greenLight2", "yellowLight2", "orangeLight2", "redLight2", "pinkLight2", "purpleLight2", "grayLight2", "blueLight1", "cyanLight1", "tealLight1", "greenLight1", "yellowLight1", "orangeLight1", "redLight1", "pinkLight1", "purpleLight1", "grayLight1", "blueBright", "cyanBright", "tealBright", "greenBright", "yellowBright", "orangeBright", "redBright", "pinkBright", "purpleBright", "grayBright", "blueDark1", "cyanDark1", "tealDark1", "greenDark1", "yellowDark1", "orangeDark1", "redDark1", "pinkDark1", "purpleDark1", "grayDark1"')
					.optional(),
				id: z.string(),
				name: z.string(),
			})),
		}),
		type: z.literal('externalSyncSource'),
	}),
	z.object({
		options: z.object({
			prompt: z
				.array(z.union([
					z.string(),
					z.object({field: z.object({fieldId: z.string()})}),
				]))
				.describe('The prompt that is used to generate the results in the AI field, additional object\ntypes may be added in the future. Currently, this is an array of strings or objects that identify any fields interpolated into the prompt.\n\nThe prompt will not currently be provided if this field config is within another\nfields configuration (like a lookup field)')
				.optional(),
			referencedFieldIds: z
				.array(z.string())
				.describe('The other fields in the record that are used in the ai field\n\nThe referencedFieldIds will not currently be provided if this field config is within another\nfields configuration (like a lookup field)')
				.optional(),
		}),
		type: z.literal('aiText'),
	}),
	z
		.object({
			options: z.object({
				linkedTableId: z
					.string()
					.describe('The ID of the table this field links to'),
				viewIdForRecordSelection: z
					.string()
					.describe('The ID of the view in the linked table\nto use when showing a list of records to select from')
					.optional(),
			}),
			type: z.literal('multipleRecordLinks'),
		})
		.describe('Creating "multipleRecordLinks" fields is supported but updating options for\nexisting "multipleRecordLinks" fields is not supported.'),
	z.object({
		options: z.object({
			choices: z.array(z.object({
				color: z
					.string()
					.describe('Optional when creating an option.')
					.optional(),
				id: z
					.string()
					.describe('This is not specified when creating new options, useful when specifing existing\noptions (for example: reordering options, keeping old options and adding new ones, etc)')
					.optional(),
				name: z.string(),
			})),
		}),
		type: z.literal('singleSelect'),
	}),
	z.object({
		options: z.object({
			choices: z.array(z.object({
				color: z
					.string()
					.describe('Optional when creating an option.')
					.optional(),
				id: z
					.string()
					.describe('This is not specified when creating new options, useful when specifing existing\noptions (for example: reordering options, keeping old options and adding new ones, etc)')
					.optional(),
				name: z.string(),
			})),
		}),
		type: z.literal('multipleSelects'),
	}),
	z.object({
		options: z.record(z.any()).optional(),
		type: z.literal('singleCollaborator'),
	}),
	z.object({
		options: z.record(z.any()).optional(),
		type: z.literal('multipleCollaborators'),
	}),
	z.object({
		options: z.object({
			dateFormat: z.object({
				format: z
					.enum(['l', 'LL', 'M/D/YYYY', 'D/M/YYYY', 'YYYY-MM-DD'])
					.describe('Format is optional when writing, but it must match\nthe corresponding name if provided.\n\n(`l` for local, `LL` for friendly, `M/D/YYYY` for us, `D/M/YYYY` for european, `YYYY-MM-DD` for iso)')
					.optional(),
				name: z.enum(['local', 'friendly', 'us', 'european', 'iso']),
			}),
		}),
		type: z.literal('date'),
	}),
	z.object({
		options: z.object({
			dateFormat: z.object({
				format: z
					.enum(['l', 'LL', 'M/D/YYYY', 'D/M/YYYY', 'YYYY-MM-DD'])
					.describe('Format is optional when writing, but it must match\nthe corresponding name if provided.\n\n(`l` for local, `LL` for friendly, `M/D/YYYY` for us, `D/M/YYYY` for european, `YYYY-MM-DD` for iso)')
					.optional(),
				name: z.enum(['local', 'friendly', 'us', 'european', 'iso']),
			}),
			timeFormat: z.object({
				format: z.enum(['h:mma', 'HH:mm']).optional(),
				name: z.enum(['12hour', '24hour']),
			}),
			timeZone: z.any(),
		}),
		type: z.literal('dateTime'),
	}),
	z.object({
		options: z.object({isReversed: z.boolean()}).optional(),
		type: z.literal('multipleAttachments'),
	}),
])).describe('The config of a field. NB: Formula fields cannot be created with this MCP due to a limitation in the Airtable API.');

export const ViewSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
});

export const TableSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	primaryFieldId: z.string(),
	fields: z.array(FieldSchema.and(z.object({id: z.string()}))),
	views: z.array(ViewSchema),
});

export const BaseSchemaResponseSchema = z.object({
	tables: z.array(TableSchema),
});

// Zod schemas for tool arguments
export const ListRecordsArgsSchema = z.object({
	baseId: z.string(),
	tableId: z.string(),
	view: z.string().optional().describe('View name or ID to use for filtering and sorting records. If provided, the view\'s filters and sorts will be applied.'),
	maxRecords: z.number().optional().describe('Maximum number of records to return. Defaults to 100.'),
	filterByFormula: z.string().optional().describe('Airtable formula to filter records'),
	sort: z.array(z.object({
		field: z.string().describe('Field name to sort by'),
		direction: z.enum(['asc', 'desc']).optional().describe('Sort direction. Defaults to asc (ascending)'),
	})).optional().describe('Specifies how to sort the records'),
});

export const SearchRecordsArgsSchema = z.object({
	baseId: z.string(),
	tableId: z.string(),
	view: z.string().optional().describe('View name or ID to use for filtering and sorting records. If provided, the view\'s filters and sorts will be applied.'),
	searchTerm: z.string().describe('Text to search for in records'),
	fieldIds: z.array(z.string()).optional().describe('Specific field ids to search in. If not provided, searches all text-based fields.'),
	maxRecords: z.number().optional().describe('Maximum number of records to return. Defaults to 100.'),
});

export const TableDetailLevelSchema = z.enum(['tableIdentifiersOnly', 'identifiersOnly', 'full']).describe(`Detail level for table information:
- tableIdentifiersOnly: table IDs and names
- identifiersOnly: table, field, and view IDs and names
- full: complete details including field types, descriptions, and configurations

Note for LLMs: To optimize context window usage, request the minimum detail level needed:
- Use 'tableIdentifiersOnly' when you only need to list or reference tables
- Use 'identifiersOnly' when you need to work with field or view references
- Only use 'full' when you need field types, descriptions, or other detailed configuration

If you only need detailed information on a few tables in a base with many complex tables, it might be more efficient for you to use list_tables with tableIdentifiersOnly, then describe_table with full on the specific tables you want.`);

export const DescribeTableArgsSchema = z.object({
	baseId: z.string(),
	tableId: z.string(),
	detailLevel: TableDetailLevelSchema.optional().default('full'),
});

export const ListTablesArgsSchema = z.object({
	baseId: z.string(),
	detailLevel: TableDetailLevelSchema.optional().default('full'),
});

export const GetRecordArgsSchema = z.object({
	baseId: z.string(),
	tableId: z.string(),
	recordId: z.string(),
});

export const CreateRecordArgsSchema = z.object({
	baseId: z.string(),
	tableId: z.string(),
	fields: z.record(z.any()),
});

export const UpdateRecordsArgsSchema = z.object({
	baseId: z.string(),
	tableId: z.string(),
	records: z.array(z.object({
		id: z.string(),
		fields: z.record(z.any()),
	})),
});

export const DeleteRecordsArgsSchema = z.object({
	baseId: z.string(),
	tableId: z.string(),
	recordIds: z.array(z.string()),
});

export const CreateTableArgsSchema = z.object({
	baseId: z.string(),
	name: z.string().describe('Name for the new table. Must be unique in the base.'),
	description: z.string().optional(),
	fields: z.array(FieldSchema).describe(`Table fields. Rules:
- At least one field must be specified.
- The primary (first) field must be one of: single line text, long text, date, phone number, email, URL, number, currency, percent, duration, formula, autonumber, barcode.`),
});

export const UpdateTableArgsSchema = z.object({
	baseId: z.string(),
	tableId: z.string(),
	name: z.string().optional(),
	description: z.string().optional(),
});

export const CreateFieldArgsSchema = z.object({
	baseId: z.string(),
	tableId: z.string(),
	// This is used as a workaround for https://github.com/orgs/modelcontextprotocol/discussions/90
	nested: z.object({
		field: FieldSchema,
	}),
});

export const UpdateFieldArgsSchema = z.object({
	baseId: z.string(),
	tableId: z.string(),
	fieldId: z.string(),
	name: z.string().optional(),
	description: z.string().optional(),
});

export type ListBasesResponse = z.infer<typeof ListBasesResponseSchema>;
export type BaseSchemaResponse = z.infer<typeof BaseSchemaResponseSchema>;
export type Base = z.infer<typeof BaseSchema>;
export type Table = z.infer<typeof TableSchema>;
export type Field = z.infer<typeof FieldSchema>;

export type FieldSet = Record<string, any>;
export type AirtableRecord = {id: string; fields: FieldSet};

export type ListRecordsOptions = {
	view?: z.infer<typeof ListRecordsArgsSchema.shape.view>;
	maxRecords?: z.infer<typeof ListRecordsArgsSchema.shape.maxRecords>;
	filterByFormula?: z.infer<typeof ListRecordsArgsSchema.shape.filterByFormula>;
	sort?: z.infer<typeof ListRecordsArgsSchema.shape.sort>;
};

export type IAirtableService = {
	listBases(): Promise<ListBasesResponse>;
	getBaseSchema(baseId: string): Promise<BaseSchemaResponse>;
	listRecords(baseId: string, tableId: string, options?: ListRecordsOptions): Promise<AirtableRecord[]>;
	getRecord(baseId: string, tableId: string, recordId: string): Promise<AirtableRecord>;
	createRecord(baseId: string, tableId: string, fields: FieldSet): Promise<AirtableRecord>;
	updateRecords(baseId: string, tableId: string, records: {id: string; fields: FieldSet}[]): Promise<AirtableRecord[]>;
	deleteRecords(baseId: string, tableId: string, recordIds: string[]): Promise<{id: string}[]>;
	createTable(baseId: string, name: string, fields: Field[], description?: string): Promise<Table>;
	updateTable(baseId: string, tableId: string, updates: {name?: string | undefined; description?: string | undefined}): Promise<Table>;
	createField(baseId: string, tableId: string, field: Field): Promise<Field & {id: string}>;
	updateField(baseId: string, tableId: string, fieldId: string, updates: {name?: string | undefined; description?: string | undefined}): Promise<Field & {id: string}>;
	searchRecords(baseId: string, tableId: string, searchTerm: string, fieldIds?: string[], maxRecords?: number, view?: string): Promise<AirtableRecord[]>;
};

export type IAirtableMCPServer = {
	connect(transport: Transport): Promise<void>;
};
