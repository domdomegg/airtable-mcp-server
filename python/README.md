# Airtable MCP Python API

Call the Airtable MCP server from Python scripts. Uses the same config as the Node server: `AIRTABLE_API_KEY` env var.

## Prerequisites

- Python 3.10+
- **Airtable MCP server** either:
  - Built in repo: run `npm run build` in repo root so `dist/main.js` exists, or
  - Available via npx: `npx -y airtable-mcp-server` (requires Node.js)
- [Airtable personal access token](https://airtable.com/create/tokens) with needed scopes

## Installation

From the repo root:

```bash
cd python
pip install -e .
```

Or with uv:

```bash
cd python
uv pip install -e .
```

## Configuration

Set your Airtable API key:

```bash
export AIRTABLE_API_KEY="pat..."
```

The Python client forwards `os.environ` to the server process, so no extra config files are needed.

## Usage

### Sync (simple scripts)

```python
from airtable_mcp import list_bases, list_tables, list_records, get_record, create_record

# List bases and tables
bases = list_bases()
tables = list_tables(baseId="appXXXXXXXXXXXXXX")

# List and get records
records = list_records(baseId="appXXX", tableId="My Table", maxRecords=10)
one = get_record(baseId="appXXX", tableId="tblXXX", recordId="recXXX")

# Create a record
create_record(baseId="appXXX", tableId="tblXXX", fields={"Name": "New row"})
```

### Async (efficient for multiple calls)

```python
import asyncio
from airtable_mcp import AirtableMCPClient

async def main():
    async with AirtableMCPClient() as client:
        bases = await client.list_bases()
        tables = await client.list_tables(baseId="appXXX")
        records = await client.list_records(baseId="appXXX", tableId="tblXXX")
        # Or call any tool by name:
        result = await client.call_tool("search_records", baseId="appXXX", tableId="tblXXX", searchTerm="hello")

asyncio.run(main())
```

### Custom server command

```python
from airtable_mcp import AirtableMCPClient

async with AirtableMCPClient(command="node", args=["/path/to/dist/main.js"]) as client:
    ...
```

## API

| Function | Description |
|----------|-------------|
| `list_bases()` | List all accessible Airtable bases |
| `list_tables(baseId, detailLevel=None)` | List tables in a base |
| `list_records(baseId, tableId, view=None, maxRecords=None, filterByFormula=None, sort=None)` | List records from a table |
| `search_records(baseId, tableId, searchTerm, ...)` | Search for records containing text |
| `describe_table(baseId, tableId, detailLevel=None)` | Get detailed table info |
| `get_record(baseId, tableId, recordId)` | Get a record by ID |
| `create_record(baseId, tableId, fields)` | Create a new record |
| `update_records(baseId, tableId, records)` | Update up to 10 records |
| `delete_records(baseId, tableId, recordIds)` | Delete records |
| `create_table(baseId, name, fields, description=None)` | Create a table |
| `update_table(baseId, tableId, name=None, description=None)` | Update table name/description |
| `create_field(baseId, tableId, nested)` | Create a field |
| `update_field(baseId, tableId, fieldId, name=None, description=None)` | Update a field |
| `list_comments(baseId, tableId, recordId, ...)` | List comments on a record |
| `create_comment(baseId, tableId, recordId, text, ...)` | Create a comment |
| `upload_attachment(baseId, recordId, attachmentFieldIdOrName, file, filename, contentType)` | Upload file to attachment field (base64) |

Additional tools can be called via `client.call_tool("tool_name", **kwargs)`.
