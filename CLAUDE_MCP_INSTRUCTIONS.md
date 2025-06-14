# Claude Instructions for Enhanced Task Coordinator MCP

When working with the Enhanced Task Coordinator MCP, follow these guidelines:

## 🚀 Enhanced MCP Usage

If the project uses the Enhanced Task Coordinator MCP (check for `enhanced-task-coordinator` in MCP tools):

### Context-Aware Task Management
- Use `add_enhanced_task` instead of `add_task` for complex tasks
- Always provide rich context including:
  - Project background
  - Technical stack
  - Related files
  - Acceptance criteria
- Use `parentContext` to inherit context from parent tasks

### Code Artifact Storage
- After generating significant code, store it using `store_code_artifact`
- Tag artifacts appropriately for future searchability
- Before implementing something, search existing artifacts with `search_artifacts`
- Reuse code from other tasks when possible

### Decision Tracking
- Use `add_conversation_turn` to record important decisions
- Mark architectural/implementation decisions with `isDecision: true`
- Include rationale for significant choices

### Task Organization
- Use `decompose_task` with templates for complex features
- Available templates: 'ui-component', 'api-endpoint', 'bug-fix', 'refactoring', 'documentation', 'feature-design'
- Create integration checkpoints before merging work from multiple tasks

### Workflow Best Practices
1. **Starting a complex task:**
   - Get enhanced task details with `get_enhanced_task`
   - Review context and previous decisions
   - Search for related artifacts

2. **During implementation:**
   - Store reusable code as artifacts
   - Document decisions in conversation
   - Update task status appropriately

3. **Completing work:**
   - Ensure all code artifacts are stored
   - Document final decisions
   - Create checkpoint if integration is needed

### Example Enhanced Workflow
```javascript
// 1. Claim task with full context
const task = await get_enhanced_task('dashboard-editor');

// 2. Search for existing components
const gauges = await search_artifacts({ 
  query: 'gauge', 
  type: 'component' 
});

// 3. Record decision
await add_conversation_turn({
  taskId: 'dashboard-editor',
  role: 'claude',
  content: 'Using Konva.js for better performance...',
  isDecision: true,
  decisionType: 'architecture'
});

// 4. Store generated code
await store_code_artifact({
  taskId: 'dashboard-editor',
  artifactId: 'gauge-widget-v1',
  type: 'component',
  // ... rest of artifact
});
```

## 🎯 When to Use Enhanced Features

- **Use enhanced tasks when:**
  - Task requires multiple files/components
  - Context from previous work is important
  - Code will be reused by others
  - Decisions need documentation

- **Use standard tasks when:**
  - Simple, isolated changes
  - Quick fixes or updates
  - No complex context needed

Remember: The enhanced features help preserve knowledge and enable better collaboration between multiple Claude instances working on the same project.