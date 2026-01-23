# Gap Analysis: Current System vs v0Alpha Schema for LLM Trackers

## Executive Summary

The current system uses a **fixed schema** approach where tracker configuration is stored directly in database columns. The new v0Alpha schema introduces a **spec-based configuration** approach where trackers are defined using a YAML/JSON structure with versioned API schemas. This analysis focuses on **LLM spec type trackers** specifically.

---

## 1. Schema Structure Differences

### Current System
- **Flat structure**: All tracker fields are stored directly in database columns
- **No versioning**: Single schema for all trackers
- **No spec type**: All trackers are implicitly LLM-based (instruction field exists)
- **No metadata separation**: Name, description mixed with configuration

### v0Alpha Schema
- **Hierarchical structure**: Uses Kubernetes-style structure with `apiVersion`, `kind`, `metadata`, and `spec`
- **Versioned**: `apiVersion: journium.app/v0Alpha`
- **Spec type discriminator**: `spec.type: "LLM"` explicitly defines tracker type
- **Metadata separation**: `metadata` contains name, displayName, description; `spec` contains configuration

**Gap**: Need to restructure data model to support spec-based storage and versioning.

---

## 2. Field Mapping Differences

### Metadata Fields

| Current System | v0Alpha Schema | Notes |
|---------------|----------------|-------|
| `name` (DB column) | `metadata.name` | Same concept, different location |
| `description` (DB column) | `metadata.description` | Same concept, different location |
| ❌ Not present | `metadata.displayName` | **NEW FIELD** - Human-friendly display name (max 120 chars) |

**Gap**: 
- Need to add `displayName` field
- Need to restructure to separate metadata from spec

### Spec Fields - LLM Type

| Current System | v0Alpha Schema | Notes |
|---------------|----------------|-------|
| `instruction` (DB column) | `spec.llmPrompt` | **FIELD RENAME** - Same concept, different name |
| `events` (DB array) | `spec.data.events` | **NESTED** - Moved under `data` object |
| `maxEvents` (DB column) | `spec.data.maxEvents` | **NESTED** - Moved under `data` object |
| ❌ Not present | `spec.data.minEvents` | **NEW FIELD** - Optional minimum events required |
| `triggerMode` (association table) | `spec.trigger.mode` | **NESTED** - Values: "automatic" vs "manual" |
| `scheduleFrequency` (association table) | `spec.trigger.schedule` | **NESTED** - Different structure (see below) |

**Gap**: 
- Field renaming: `instruction` → `llmPrompt`
- Field nesting: Events and maxEvents moved under `data` object
- New field: `minEvents` optional
- Trigger structure completely different

---

## 3. Trigger/Schedule Structure Differences

### Current System
```typescript
triggerMode: TriggerMode // "SCHEDULED" | "MANUAL"
scheduleFrequency?: ScheduleFrequency // "MINUTELY" | "HALF_HOURLY" | "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY"
```

**Logic**: 
- If `triggerMode === SCHEDULED`, then `scheduleFrequency` is required
- `scheduleFrequency` is an enum with 6 preset values

### v0Alpha Schema
```yaml
trigger:
  mode: "automatic" | "manual"
  schedule: # Required when mode is "automatic"
    - Preset: "hourly" | "daily" | "weekly" | "monthly"
    - OR Cron: { cron: "..." }
```

**Key Differences**:
1. **Terminology**: `SCHEDULED` → `automatic`, `MANUAL` → `manual`
2. **Schedule presets**: Reduced from 6 to 4 options (removed `MINUTELY`, `HALF_HOURLY`)
3. **Cron support**: **NEW FEATURE** - Can use custom cron expressions instead of presets
4. **Structure**: Nested under `trigger` object instead of flat fields

**Gap**:
- Need to map `SCHEDULED` → `automatic`, `MANUAL` → `manual`
- Need to handle cron expressions (new feature)
- Need to migrate existing `MINUTELY` and `HALF_HOURLY` schedules (may need to convert to cron)
- Need to restructure trigger data storage

---

## 4. Data Selection Structure Differences

### Current System
```typescript
events: string[] // Empty array = all events
maxEvents?: number // Optional, defaults to 100
```

**Storage**: Flat fields in `InsightTracker` table

### v0Alpha Schema
```yaml
data:
  events: "*" | ["event1", "event2", ...] # "*" = all events, array = allowlist
  maxEvents?: number # Optional maximum
  minEvents?: number # Optional minimum (NEW)
```

**Key Differences**:
1. **All events representation**: Empty array `[]` → `"*"` string
2. **Nested structure**: Under `data` object
3. **New field**: `minEvents` for minimum event threshold

**Gap**:
- Need to convert empty array to `"*"` and vice versa
- Need to add `minEvents` support
- Need to restructure data storage

---

## 5. Database Schema Gaps

### Current Database Structure

**`insight_trackers` table**:
- `id`, `name`, `description`, `events` (array), `maxEvents`, `instruction`
- `organizationId`, `ownership`, `createdByUserId`
- `createdAt`, `updatedAt`, `deletedAt`

**`app_instance_insight_trackers` table** (association):
- `id`, `appInstanceId`, `insightTrackerId`
- `status`, `triggerMode`, `scheduleFrequency`
- `createdAt`, `updatedAt`, `deletedAt`

### Required Changes for v0Alpha

1. **Add `displayName` field** to `insight_trackers` table
2. **Add `apiVersion` field** to track schema version (e.g., `journium.app/v0Alpha`)
3. **Add `specType` field** to track spec type (`LLM` | `funnel`)
4. **Rename `instruction` → `llmPrompt`** OR store spec as JSON/YAML
5. **Add `minEvents` field** to `insight_trackers` table
6. **Restructure trigger data**:
   - Option A: Keep flat but add `triggerMode` mapping logic
   - Option B: Store trigger as JSON in association table
7. **Add cron schedule support**:
   - Option A: Add `scheduleCron` field alongside `scheduleFrequency`
   - Option B: Store schedule as JSON (`{ type: "preset" | "cron", value: "..." }`)

**Migration Considerations**:
- Existing trackers need to be migrated to v0Alpha format
- Need to handle both old and new formats during transition period
- Default values: `apiVersion = "journium.app/v0Alpha"`, `specType = "LLM"` for existing trackers

---

## 6. API/Backend Gaps

### Current API (`CreateInsightTrackerRequest`)

```typescript
{
  name: string;
  description?: string;
  events?: string[];
  instruction?: string;
  status?: TrackerStatus;
  maxEvents?: number;
  triggerMode?: TriggerMode;
  scheduleFrequency?: ScheduleFrequency | null;
}
```

### Required for v0Alpha LLM Spec

**Option 1: Store as YAML/JSON blob**
```typescript
{
  apiVersion: "journium.app/v0Alpha";
  kind: "InsightTracker";
  metadata: {
    name: string;
    displayName: string;
    description?: string;
  };
  spec: {
    type: "LLM";
    trigger: {
      mode: "automatic" | "manual";
      schedule?: string | { cron: string };
    };
    llmPrompt: string;
    data: {
      events?: "*" | string[];
      minEvents?: number;
      maxEvents?: number;
    };
  };
}
```

**Option 2: Flatten for API, store as spec**
- API accepts flattened structure
- Backend converts to spec format before storage
- Storage: Store full spec as JSON/YAML in database

**Gap**:
- Need to decide on storage strategy (JSON blob vs normalized columns)
- Need to update validation schemas (Zod schemas)
- Need to handle YAML import/export (already partially implemented)
- Need to update service layer to work with spec structure

---

## 7. Frontend/UI Gaps

### Current UI Form (`new/page.tsx`)

**Form Fields**:
1. Status Card: `status` (ACTIVE/DRAFT)
2. Basic Info Card: `name`, `description`, `instruction`
3. Configuration Card: `maxEvents`, `triggerMode`, `scheduleFrequency`
4. Events Card: `tracksAllEvents` (boolean), `events` (array)

### Required Changes for v0Alpha LLM Spec

1. **Add Tracker Type Selection** (NEW):
   - First screen: Choose tracker type (`LLM` or `funnel`)
   - Only show LLM form if `LLM` selected

2. **Add Display Name Field** (NEW):
   - Add `displayName` input in Basic Info Card
   - Validation: 1-120 characters

3. **Rename Instruction → LLM Prompt**:
   - Update label: "Instruction" → "LLM Prompt"
   - Update field name: `instruction` → `llmPrompt`

4. **Restructure Events Section**:
   - Change "Track all events" toggle to use `"*"` instead of empty array
   - Move events under "Data" section visually

5. **Restructure Trigger Section**:
   - Change "Trigger Mode" to "Mode" with values "Automatic" / "Manual"
   - Update schedule options: Remove `MINUTELY`, `HALF_HOURLY`
   - Add cron expression input option (advanced)
   - Nest under "Trigger" section

6. **Add Min Events Field** (NEW):
   - Add `minEvents` input in Data/Configuration section
   - Optional field, minimum value 1

7. **Add Data Section**:
   - Group `events`, `minEvents`, `maxEvents` under "Data" section

**Gap**:
- Need to add tracker type selection screen
- Need to update form structure to match spec hierarchy
- Need to handle cron expression input (new UI component)
- Need to update validation logic
- Need to update form submission to match new API structure

---

## 8. Validation Gaps

### Current Validation

**Zod Schema** (`createInsightTrackerSchema`):
- `name`: 1-200 chars
- `description`: max 1000 chars
- `instruction`: max 5000 chars
- `events`: array of strings (optional)
- `maxEvents`: 1-1000
- `triggerMode`: enum
- `scheduleFrequency`: enum (nullable)

### Required Validation for v0Alpha

**Base Schema Validation**:
- `metadata.name`: 3-63 chars, kebab-case pattern `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`
- `metadata.displayName`: 1-120 chars
- `metadata.description`: 1-1000 chars (optional)

**LLM Spec Validation**:
- `spec.type`: must be `"LLM"`
- `spec.llmPrompt`: min 1 char (required)
- `spec.trigger.mode`: `"automatic"` | `"manual"`
- `spec.trigger.schedule`: Required if mode is `"automatic"`
  - Preset: `"hourly"` | `"daily"` | `"weekly"` | `"monthly"`
  - OR Cron: `{ cron: string }` (minLength 1)
- `spec.data.events`: `"*"` OR array of non-empty strings (minItems 1, uniqueItems)
- `spec.data.minEvents`: integer, minimum 1 (optional)
- `spec.data.maxEvents`: integer, minimum 1 (optional)

**Gap**:
- Need to update validation schemas
- Need to add kebab-case validation for `metadata.name`
- Need to add cron expression validation (format validation)
- Need to handle conditional validation (schedule required when mode is automatic)
- Need to validate spec structure matches selected type

---

## 9. YAML Import/Export Gaps

### Current Implementation

**YAML Import** (already partially implemented):
- Endpoint: `POST /insight-trackers?method=import`
- Validates YAML against schema URL
- Returns validation result (no-op creation)

**Missing**:
- Actual creation from YAML
- YAML export functionality
- Conversion between current format and v0Alpha format

### Required for v0Alpha

1. **YAML Import**:
   - Parse YAML file
   - Validate against v0Alpha schema
   - Convert to database format (or store as JSON blob)
   - Create tracker

2. **YAML Export**:
   - Convert database record to v0Alpha YAML format
   - Include all required fields
   - Format according to schema

3. **Format Conversion**:
   - Convert existing trackers to v0Alpha format
   - Convert v0Alpha format to current format (for backward compatibility)

**Gap**:
- Need to implement YAML → database conversion
- Need to implement database → YAML conversion
- Need to handle format migration

---

## 10. Summary of Critical Gaps

### High Priority

1. **Database Schema Changes**:
   - Add `displayName`, `apiVersion`, `specType` fields
   - Add `minEvents` field
   - Decide on storage strategy (normalized vs JSON blob)
   - Handle trigger/schedule restructuring

2. **API Structure Changes**:
   - Update request/response types to match v0Alpha spec
   - Update validation schemas
   - Handle YAML import/export

3. **Frontend Form Restructure**:
   - Add tracker type selection screen
   - Add displayName field
   - Rename instruction → llmPrompt
   - Restructure form to match spec hierarchy
   - Add cron expression support

4. **Field Mapping & Conversion**:
   - Map `SCHEDULED` → `automatic`, `MANUAL` → `manual`
   - Map empty array `[]` → `"*"` for all events
   - Handle schedule frequency migration (MINUTELY/HALF_HOURLY → cron)

### Medium Priority

5. **Validation Updates**:
   - Update all validation schemas
   - Add kebab-case validation for name
   - Add cron expression validation

6. **Migration Strategy**:
   - Migrate existing trackers to v0Alpha format
   - Handle backward compatibility
   - Data migration scripts

### Low Priority

7. **Documentation**:
   - Update API documentation
   - Update UI help text
   - Migration guide for users

---

## 11. Recommended Implementation Approach

### Phase 1: Foundation
1. Add database fields: `displayName`, `apiVersion`, `specType`, `minEvents`
2. Update TypeScript types to include v0Alpha structure
3. Create conversion utilities (current format ↔ v0Alpha format)

### Phase 2: Backend
1. Update API to accept v0Alpha structure (support both formats during transition)
2. Update validation schemas
3. Implement YAML import/export
4. Update service layer to handle spec structure

### Phase 3: Frontend
1. Add tracker type selection screen
2. Update form to match v0Alpha structure
3. Add displayName field
4. Restructure form sections (Trigger, Data)
5. Add cron expression support

### Phase 4: Migration
1. Create migration script for existing trackers
2. Test migration with sample data
3. Deploy migration

---

## 12. Open Questions

1. **Storage Strategy**: Store as normalized columns or JSON/YAML blob?
   - Recommendation: Normalized columns for queryability, with JSON backup

2. **Backward Compatibility**: Support both old and new formats?
   - Recommendation: Yes, during transition period

3. **Cron Validation**: How strict should cron validation be?
   - Recommendation: Basic format validation, runtime validation by scheduler

4. **Schedule Migration**: How to handle MINUTELY/HALF_HOURLY?
   - Recommendation: Convert to equivalent cron expressions

5. **API Design**: Accept flattened structure or full spec?
   - Recommendation: Accept flattened for UI, convert to spec internally
