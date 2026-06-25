# airtable-mcp-server

A Model Context Protocol server that provides read and write access to Airtable databases. This server enables LLMs to inspect database schemas, then read and write records.

https://github.com/user-attachments/assets/c8285e76-d0ed-4018-94c7-20535db6c944

## Installation

Follow the up-to-date instructions on [install-mcp](https://adamjones.me/install-mcp/?config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsImFpcnRhYmxlLW1jcC1zZXJ2ZXIiXSwibmFtZSI6ImFpcnRhYmxlIiwiZW52Ijp7IkFJUlRBQkxFX0FQSV9LRVkiOiJwYXQxMjMuYWJjMTIzIn19), which generates the right config for your MCP client (Claude Code, Claude Desktop, Cursor, Cline, VS Code, and more).

You'll need an Airtable personal access token — [create one here](https://airtable.com/create/tokens/new) with scopes `schema.bases:read` and `data.records:read` (and optionally `schema.bases:write`, `data.records:write`, `data.recordComments:read`, `data.recordComments:write`), and access to the bases you want to use. It looks something like `pat123.abc123` (but longer). Set it as `AIRTABLE_API_KEY` (replacing the placeholder in the generated config).

## Components

### Tools

- **list_records**
  - Lists records from a specified Airtable table
  - Input parameters:
    - `baseId` (string, required): The ID of the Airtable base
    - `tableId` (string, required): The ID of the table to query
    - `maxRecords` (number, optional): Maximum number of records to return. Defaults to 100.
    - `filterByFormula` (string, optional): Airtable formula to filter records

- **search_records**
  - Search for records containing specific text
  - Input parameters:
    - `baseId` (string, required): The ID of the Airtable base
    - `tableId` (string, required): The ID of the table to query
    - `searchTerm` (string, required): Text to search for in records
    - `fieldIds` (array, optional): Specific field IDs to search in. If not provided, searches all text-based fields.
    - `maxRecords` (number, optional): Maximum number of records to return. Defaults to 100.

- **list_bases**
  - Lists all accessible Airtable bases
  - No input parameters required
  - Returns base ID, name, and permission level

- **list_tables**
  - Lists all tables in a specific base
  - Input parameters:
    - `baseId` (string, required): The ID of the Airtable base
    - `detailLevel` (string, optional): The amount of detail to get about the tables (`tableIdentifiersOnly`, `identifiersOnly`, or `full`)
  - Returns table ID, name, description, fields, and views (to the given `detailLevel`)

- **describe_table**
  - Gets detailed information about a specific table
  - Input parameters:
    - `baseId` (string, required): The ID of the Airtable base
    - `tableId` (string, required): The ID of the table to describe
    - `detailLevel` (string, optional): The amount of detail to get about the table (`tableIdentifiersOnly`, `identifiersOnly`, or `full`)
  - Returns the same format as list_tables but for a single table
  - Useful for getting details about a specific table without fetching information about all tables in the base

- **get_record**
  - Gets a specific record by ID
  - Input parameters:
    - `baseId` (string, required): The ID of the Airtable base
    - `tableId` (string, required): The ID of the table
    - `recordId` (string, required): The ID of the record to retrieve

- **create_record**
  - Creates a new record in a table
  - Input parameters:
    - `baseId` (string, required): The ID of the Airtable base
    - `tableId` (string, required): The ID of the table
    - `fields` (object, required): The fields and values for the new record

- **update_records**
  - Updates one or more records in a table
  - Input parameters:
    - `baseId` (string, required): The ID of the Airtable base
    - `tableId` (string, required): The ID of the table
    - `records` (array, required): Array of objects containing record ID and fields to update

- **delete_records**
  - Deletes one or more records from a table
  - Input parameters:
    - `baseId` (string, required): The ID of the Airtable base
    - `tableId` (string, required): The ID of the table
    - `recordIds` (array, required): Array of record IDs to delete

- **create_table**
  - Creates a new table in a base
  - Input parameters:
    - `baseId` (string, required): The ID of the Airtable base
    - `name` (string, required): Name of the new table
    - `description` (string, optional): Description of the table
    - `fields` (array, required): Array of field definitions (name, type, description, options)

- **update_table**
  - Updates a table's name or description
  - Input parameters:
    - `baseId` (string, required): The ID of the Airtable base
    - `tableId` (string, required): The ID of the table
    - `name` (string, optional): New name for the table
    - `description` (string, optional): New description for the table

- **create_field**
  - Creates a new field in a table
  - Input parameters:
    - `baseId` (string, required): The ID of the Airtable base
    - `tableId` (string, required): The ID of the table
    - `name` (string, required): Name of the new field
    - `type` (string, required): Type of the field
    - `description` (string, optional): Description of the field
    - `options` (object, optional): Field-specific options

- **update_field**
  - Updates a field's name or description
  - Input parameters:
    - `baseId` (string, required): The ID of the Airtable base
    - `tableId` (string, required): The ID of the table
    - `fieldId` (string, required): The ID of the field
    - `name` (string, optional): New name for the field
    - `description` (string, optional): New description for the field

- **create_comment**
  - Creates a comment on a record
  - Input parameters:
    - `baseId` (string, required): The ID of the Airtable base
    - `tableId` (string, required): The ID of the table
    - `recordId` (string, required): The ID of the record
    - `text` (string, required): The comment text
    - `parentCommentId` (string, optional): Parent comment ID for threaded replies
  - Returns the created comment with ID, author, creation time, and text

- **list_comments**
  - Lists comments on a record
  - Input parameters:
    - `baseId` (string, required): The ID of the Airtable base
    - `tableId` (string, required): The ID of the table
    - `recordId` (string, required): The ID of the record
    - `pageSize` (number, optional): Number of comments to return (max 100, default 100)
    - `offset` (string, optional): Pagination offset for retrieving additional comments
  - Returns comments array with author, text, timestamps, reactions, and mentions
  - Comments are returned from newest to oldest

### HTTP Transport

The server can also run in HTTP mode for use with remote MCP clients:

```bash
MCP_TRANSPORT=http PORT=3000 npx airtable-mcp-server
```

This starts a stateless HTTP server at `http://localhost:3000/mcp`. Note: HTTP transport has no built-in authentication - only use behind a reverse proxy or in a secured environment.

## Contributing

Pull requests are welcomed on GitHub! To get started:

1. Install Git and Node.js
2. Clone the repository
3. Install dependencies with `npm install`
4. Run `npm run test` to run tests
5. Build with `npm run build`
  - You can use `npm run build:watch` to automatically build after editing [`src/index.ts`](./src/index.ts). This means you can hit save, reload Claude Desktop (with Ctrl/Cmd+R), and the changes apply.

## Releases

Versions follow the [semantic versioning spec](https://semver.org/).

To release:

1. Use `npm version <major | minor | patch>` to bump the version
2. Run `git push --follow-tags` to push with tags
3. Wait for GitHub Actions to publish to the NPM registry.
