import {z} from 'zod';

// Shared input schema fields for tools that operate on bases
export const baseId = {
	baseId: z.string().describe('The ID of the base'),
};

// Shared input schema fields for tools that operate on tables
export const tableId = {
	...baseId,
	tableId: z.string().describe('The ID or name of the table'),
};

// Shared input schema fields for tools that operate on records
export const recordId = {
	...tableId,
	recordId: z.string().describe('The ID of the record'),
};

// Detail level for table information
export const detailLevel = z.enum(['tableIdentifiersOnly', 'identifiersOnly', 'full']).describe(`Detail level for table information:
- tableIdentifiersOnly: table IDs and names
- identifiersOnly: table, field, and view IDs and names
- full: complete details including field types, descriptions, and configurations

Note for LLMs: To optimize context window usage, request the minimum detail level needed:
- Use 'tableIdentifiersOnly' when you only need to list or reference tables
- Use 'identifiersOnly' when you need to work with field or view references
- Only use 'full' when you need field types, descriptions, or other detailed configuration

If you only need detailed information on a few tables in a base with many complex tables, it might be more efficient for you to use list_tables with tableIdentifiersOnly, then describe_table with full on the specific tables you want.`);
