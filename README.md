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
│   ├── journium-insight-tracker.v0Alpha.schema.json  # v0Alpha API version schema
│   └── journium-insight-tracker.v0Beta.schema.json   # v0Beta API version schema (current)
└── trackers/
    └── examples/              # Example tracker configurations
        ├── looply/            # Sample trackers for the Looply sample app
        └── v0beta/            # v0Beta example trackers (one per analysis type)
```

## Schema Versions

The schemas in this repository are published at `https://journium.app/schemas/`. You can reference them directly in your tracker configurations or use them for validation.

**Canonical Schema URL:** `https://journium.app/schemas/journium-insight-tracker.schema.json`

| API Version | Status | Schema URL |
|------------|--------|------------|
| `journium.app/v0Beta` | **Beta (current)** | [v0Beta Schema](https://raw.githubusercontent.com/journium/journium-insight-tracking/refs/heads/feat/insight-tracker-v0beta/schemas/journium-insight-tracker.v0Beta.schema.json) |

## Quick Start

### v0Beta Tracker Example

```yaml
apiVersion: journium.app/v0Beta
kind: InsightTracker
metadata:
  name: onboarding-funnel
  displayName: Onboarding Funnel Drop-off
  description: Tracks conversion through the onboarding funnel and identifies the biggest drop-off step.
spec:
  type: LLM
  trigger:
    mode: automatic
    schedule: daily
  window:
    period: last_7d
    granularity: day
  analysis:
    type: funnel
    entity: person_id
    conversionWindow: 48h
    steps:
      - event: signup_started
        label: Started Signup
      - event: email_verified
        label: Verified Email
      - event: first_action_taken
        label: Took First Action
  llm:
    promptTemplate: |
      Funnel steps: {{stepsSummary}}
      Biggest drop-off: {{worstStep}} ({{worstStepLoss}} users lost).
      In 2 sentences: identify the critical drop-off and suggest one experiment.
    maxOutputTokens: 400
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

Explore the `trackers/examples/` directory for production-ready tracker configurations.

### v0Beta examples

| File | Analysis Type | Description |
|------|--------------|-------------|
| [onboarding-funnel.yml](trackers/examples/v0beta/onboarding-funnel.yml) | `funnel` | 4-step onboarding funnel |
| [weekly-cohort-retention.yml](trackers/examples/v0beta/weekly-cohort-retention.yml) | `retention` | Weekly cohort D1/D7/D30 retention |
| [churn-risk-signal.yml](trackers/examples/v0beta/churn-risk-signal.yml) | `churn` | 14-day inactivity churn-risk signal |
| [activation-aha-moment.yml](trackers/examples/v0beta/activation-aha-moment.yml) | `activation` | Signup-to-aha-moment activation rate |
| [signup-anomaly-detector.yml](trackers/examples/v0beta/signup-anomaly-detector.yml) | `anomaly` | Daily signup anomaly detection |
| [ai-assistant-adoption.yml](trackers/examples/v0beta/ai-assistant-adoption.yml) | `featureAdoption` | Feature adoption by plan and region |

### Looply examples (sample app)

| File | Analysis Type | Description |
|------|--------------|-------------|
| [looply/journium-tracker.yml](trackers/examples/looply/journium-tracker.yml) | `funnel` | Onboarding funnel: signup → first habit |
| [looply/my-journium-tracker-v1.yml](trackers/examples/looply/my-journium-tracker-v1.yml) | `activation` | Signup-to-first-habit activation rate |
| [looply/my-journium-tracker-v2.yml](trackers/examples/looply/my-journium-tracker-v2.yml) | `retention` | Weekly habit retention cohorts |

## Contributing

If you have suggestions for schema improvements or would like to contribute example trackers, please open an issue or pull request.

## License

See [LICENSE](LICENSE) file for details.

## Support

For questions or issues:
- Documentation: [https://journium.app/docs](https://journium.app/docs)
- Issues: [GitHub Issues](https://github.com/journium/journium-insight-tracking/issues)
