# Using Task Coordinator MCP Server with Web Interface

The Task Coordinator MCP server includes a web dashboard for visualizing tasks and worker slots. By default, the web server starts on port 3333 when running the MCP server.

## Port Configuration

If port 3333 is already in use, you can specify a different port:

```bash
# Run MCP server with web interface on port 3334
node dist/index.js --port=3334
```

## Disabling the Web Interface

If you want to run the MCP server without the web interface:

```bash
node dist/index.js --no-web
```

## Accessing the Dashboard

Once the MCP server is running, open your browser to:
- Default: http://localhost:3333
- Custom port: http://localhost:YOUR_PORT

The dashboard provides real-time updates of:
- Worker slot status
- Task queue and dependencies
- Task progress and completion status

## Running in Development

For development with hot-reload:

```bash
# MCP server with web interface
npm run dev:web

# MCP server without web interface  
npm run dev -- --no-web

# Custom port
npm run dev -- --port=3334
```