# GEMINI.md

This file provides foundational mandates for Gemini CLI when working in this project. It takes absolute precedence over general defaults.

## Core Mandates & Engineering Standards

- **Technical Integrity**: You are responsible for the entire lifecycle: implementation, testing, and validation.
- **Principles**: Rigorously follow **YAGNI** (You Aren't Gonna Need It), **KISS** (Keep It Simple, Stupid), and **DRY** (Don't Repeat Yourself).
- **File Size Management**: Keep individual code files under 200 lines. Split large files into smaller, focused modules. Use kebab-case for naming.
- **Context Efficiency**: Minimize unnecessary turns. Combine tool calls (e.g., parallel `grep_search` and `read_file`).
- **Validation**: Behavioral correctness must be verified via automated tests. No change is complete without verification logic.

## Workflows

### Primary Lifecycle (Research -> Strategy -> Execution)

1. **Research**: Map the codebase and validate assumptions. **Empirically reproduce reported issues.**
2. **Strategy**: Formulate a grounded plan. Delegate to a "Planner" sub-agent if complex.
3. **Execution**: For each sub-task, use iterative **Plan -> Act -> Validate** cycle.

### Specialized Agent Delegation

When tasks are complex, delegate to specialized "sub-agents" using the `generalist` tool. Provide them with their specific mission from `.claude/agents/*.md`.

- **Planner**: Research approaches and create implementation plans in `./plans`.
- **Researcher**: Investigate specific technical topics and report back.
- **Tester**: Generate and run comprehensive test suites.
- **Code Reviewer**: Perform automated code quality analysis.
- **Debugger**: Analyze logs/errors and provide root cause analysis.
- **Docs Manager**: Maintain synchronized technical documentation in `./docs`.
- **Git Manager**: Create clean, conventional commit messages.

**Delegation Protocol**: Always include work context path, reports path (`./plans/reports/`), and plans path (`./plans/`) in the delegation prompt.

## Tool Usage Adaptations

- **User Interaction**: Use `ask_user` tool for any questions or approval requests (equivalent to `AskUserQuestion`).
- **Task Delegation**: Use `generalist` or `codebase_investigator` for delegating to specialized agents (equivalent to `Task` tool).
- **Code Search**: Use `grep_search` and `glob` extensively for codebase exploration.
- **Modifications**: Use `replace` for surgical edits or `write_file` for new/small files.

## Specialized Skills

Activate project-specific skills in `.claude/skills/` as needed for the task:
- `seedstr`: Handle job marketplace operations.
- `ai-multimodal`: Analyze audio, video, documents, and images.
- `chrome-devtools`: Browser automation and performance analysis.
- `repomix`: Package codebase for AI analysis.
- And others as cataloged in `guide/SKILLS.md`.

## Integration with claudekit-engineer

This project uses the `claudekit-engineer` framework. Follow the protocols in:
- `./.claude/rules/primary-workflow.md`
- `./.claude/rules/development-rules.md`
- `./.claude/rules/orchestration-protocol.md`
- `./.claude/rules/documentation-management.md`

**COMMANDS**: When a user mentions a "command" like `/plan`, `/cook`, `/test`, or `/review`, refer to the corresponding instruction in `./.claude/commands/` to fulfill the mission.
