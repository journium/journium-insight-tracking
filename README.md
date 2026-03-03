# Journium InsightTracker Schemas

Public repository containing the official schemas and examples for Journium InsightTrackers.

## Overview

Journium InsightTrackers enable automated analysis and insight generation from your application events. This repository provides the JSON Schema definitions and YAML examples for creating and validating InsightTracker configurations.

## What is an InsightTracker?

An InsightTracker is a declarative configuration that defines:
- **What events to track** - Specify which application events to monitor
- **When to analyze** - Configure automatic or manual trigger schedules  
- **How to generate insights** - Define analysis logic using LLM prompts or custom code

## Repository Structure

```
.
├── schemas/                                          # JSON Schema definitions
│   ├── journium-insight-tracker.schema.json          # Main schema with version routing
│   ├── journium-insight-tracker.base.schema.json     # Shared base definitions
│   └── journium-insight-tracker.v0Alpha.schema.json  # v0Alpha API version schema
└── trackers/
    └── examples/              # Example tracker configurations
        └── looply/            # Sample trackers for the Looply sample app
```

## Schema Versions

The schemas in this repository are published at `https://journium.app/schemas/`. You can reference them directly in your tracker configurations or use them for validation.

**Canonical Schema URL:** `https://journium.app/schemas/journium-insight-tracker.schema.json`

| API Version | Status | Schema URL |
|------------|--------|------------|
| `journium.app/v0Alpha` | Alpha | [v0Alpha Schema](https://journium.app/schemas/journium-insight-tracker.v0Alpha.schema.json) |

## Quick Start

### Basic Tracker Example

```yaml
apiVersion: journium.app/v0Alpha
kind: InsightTracker
metadata:
  name: signup-to-first-habit
  displayName: Signup to First Habit Dropoff
  description: Track user progression from signup to habit creation
spec:
  type: LLM
  llmPrompt: |
    Analyze user signup to first habit creation patterns.
    Identify dropoff points and generate actionable insights.
  trigger:
    mode: automatic
    schedule: daily
  data:
    events: 
      - signup_completed
      - habit_created
```

## Schema Validation

### VS Code Extension

The **Journium VS Code Extension** provides:
- Real-time schema validation for tracker YAML files
- Autocomplete and IntelliSense support
- Inline documentation and examples
- Syntax highlighting for Journium trackers

**Install:**
- **VS Code:** [Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=Journium.journium)
- **Cursor, Codeium, and other IDEs:** [Install from Open VSX Registry](https://open-vsx.org/extension/Journium/journium)

### Command Line Validation

All tracker configurations can be validated against the appropriate schema:

```bash
# Using a JSON Schema validator
jsonschema -i your-tracker.yml schemas/journium-insight-tracker.schema.json
```

## More Examples

Explore the `trackers/examples/` directory for production-ready tracker configurations:

- [Signup to First Habit Tracker](trackers/examples/looply/journium-tracker.yml)
- Additional examples coming soon

## Contributing

If you have suggestions for schema improvements or would like to contribute example trackers, please open an issue or pull request.

## License

See [LICENSE](LICENSE) file for details.

## Support

For questions or issues:
- Documentation: [https://journium.app/docs](https://journium.app/docs)
- Issues: [GitHub Issues](https://github.com/journium/journium-insight-tracking/issues)

---

**Note:** Journium InsightTrackers are currently in Alpha. The schema and features are subject to change.
