"""
Python API for Airtable MCP Server.

Use the Node-based MCP server from Python scripts. Same config: AIRTABLE_API_KEY env var.
Requires the server built in repo (dist/main.js) or npx (airtable-mcp-server).

Async:
    from airtable_mcp import AirtableMCPClient

    async def main():
        async with AirtableMCPClient() as client:
            bases = await client.list_bases()
            records = await client.list_records(baseId="...", tableId="...")
            print(bases, records)

Sync:
    from airtable_mcp import list_bases, list_records

    bases = list_bases()
    records = list_records(baseId="...", tableId="...")
"""

from .api import (
    create_comment,
    create_field,
    create_record,
    create_table,
    delete_records,
    describe_table,
    get_record,
    list_bases,
    list_comments,
    list_records,
    list_tables,
    search_records,
    update_field,
    update_records,
    update_table,
    upload_attachment,
)
from .client import AirtableMCPClient, run_async

__all__ = [
    "AirtableMCPClient",
    "run_async",
    "list_bases",
    "list_tables",
    "list_records",
    "search_records",
    "describe_table",
    "get_record",
    "create_record",
    "update_records",
    "delete_records",
    "create_table",
    "update_table",
    "create_field",
    "update_field",
    "list_comments",
    "create_comment",
    "upload_attachment",
]
