// To parse this data:
//
//   import { Convert, Types1 } from "./file";
//
//   const types1 = Convert.toTypes1(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface Types1 {
    $schema:              string;
    $id:                  string;
    title:                string;
    description:          string;
    type:                 string;
    required:             string[];
    additionalProperties: boolean;
    properties:           Types1Properties;
    $defs:                Defs;
}

export interface Defs {
    trigger:    Trigger;
    LLMSpec:    Spec;
    FunnelSpec: Spec;
    dataSpec:   DataSpec;
}

export interface Spec {
    type:                 string;
    description:          string;
    required:             string[];
    additionalProperties: boolean;
    properties:           FunnelSpecProperties;
}

export interface FunnelSpecProperties {
    type:       APIVersion;
    trigger:    Data;
    data:       Data;
    llmPrompt?: LlmPrompt;
}

export interface Data {
    $ref:        string;
    description: string;
}

export interface LlmPrompt {
    type:        string;
    minLength:   number;
    description: string;
    maxLength?:  number;
    pattern?:    string;
}

export interface APIVersion {
    type:        string;
    const:       string;
    description: string;
}

export interface DataSpec {
    type:                 string;
    description:          string;
    additionalProperties: boolean;
    properties:           DataSpecProperties;
}

export interface DataSpecProperties {
    minEvents: MaxEventsClass;
    maxEvents: MaxEventsClass;
    events:    Events;
}

export interface Events {
    description: string;
    oneOf:       EventsOneOf[];
}

export interface EventsOneOf {
    type:         string;
    const?:       string;
    description:  string;
    minItems?:    number;
    uniqueItems?: boolean;
    items?:       LlmPrompt;
}

export interface MaxEventsClass {
    type:        string;
    minimum:     number;
    description: string;
}

export interface Trigger {
    type:                 string;
    description:          string;
    required:             string[];
    additionalProperties: boolean;
    properties:           TriggerProperties;
    allOf:                AllOf[];
}

export interface AllOf {
    if:   If;
    then: Then;
}

export interface If {
    properties: IfProperties;
    required:   string[];
}

export interface IfProperties {
    mode: PurpleMode;
}

export interface PurpleMode {
    const: string;
}

export interface Then {
    required: string[];
}

export interface TriggerProperties {
    mode:     FluffyMode;
    schedule: Schedule;
}

export interface FluffyMode {
    type:        string;
    enum:        string[];
    description: string;
}

export interface Schedule {
    description: string;
    oneOf:       ScheduleOneOf[];
}

export interface ScheduleOneOf {
    type:                  string;
    enum?:                 string[];
    description:           string;
    additionalProperties?: boolean;
    required?:             string[];
    properties?:           OneOfProperties;
}

export interface OneOfProperties {
    cron: LlmPrompt;
}

export interface Types1Properties {
    apiVersion: APIVersion;
    kind:       APIVersion;
    metadata:   Metadata;
    spec:       SpecClass;
}

export interface Metadata {
    type:                 string;
    description:          string;
    required:             string[];
    additionalProperties: boolean;
    properties:           MetadataProperties;
}

export interface MetadataProperties {
    name:        LlmPrompt;
    displayName: LlmPrompt;
    description: LlmPrompt;
}

export interface SpecClass {
    description: string;
    oneOf:       SpecOneOf[];
}

export interface SpecOneOf {
    $ref: string;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toTypes1(json: string): Types1 {
        return cast(JSON.parse(json), r("Types1"));
    }

    public static types1ToJson(value: Types1): string {
        return JSON.stringify(uncast(value, r("Types1")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "Types1": o([
        { json: "$schema", js: "$schema", typ: "" },
        { json: "$id", js: "$id", typ: "" },
        { json: "title", js: "title", typ: "" },
        { json: "description", js: "description", typ: "" },
        { json: "type", js: "type", typ: "" },
        { json: "required", js: "required", typ: a("") },
        { json: "additionalProperties", js: "additionalProperties", typ: true },
        { json: "properties", js: "properties", typ: r("Types1Properties") },
        { json: "$defs", js: "$defs", typ: r("Defs") },
    ], false),
    "Defs": o([
        { json: "trigger", js: "trigger", typ: r("Trigger") },
        { json: "LLMSpec", js: "LLMSpec", typ: r("Spec") },
        { json: "FunnelSpec", js: "FunnelSpec", typ: r("Spec") },
        { json: "dataSpec", js: "dataSpec", typ: r("DataSpec") },
    ], false),
    "Spec": o([
        { json: "type", js: "type", typ: "" },
        { json: "description", js: "description", typ: "" },
        { json: "required", js: "required", typ: a("") },
        { json: "additionalProperties", js: "additionalProperties", typ: true },
        { json: "properties", js: "properties", typ: r("FunnelSpecProperties") },
    ], false),
    "FunnelSpecProperties": o([
        { json: "type", js: "type", typ: r("APIVersion") },
        { json: "trigger", js: "trigger", typ: r("Data") },
        { json: "data", js: "data", typ: r("Data") },
        { json: "llmPrompt", js: "llmPrompt", typ: u(undefined, r("LlmPrompt")) },
    ], false),
    "Data": o([
        { json: "$ref", js: "$ref", typ: "" },
        { json: "description", js: "description", typ: "" },
    ], false),
    "LlmPrompt": o([
        { json: "type", js: "type", typ: "" },
        { json: "minLength", js: "minLength", typ: 0 },
        { json: "description", js: "description", typ: "" },
        { json: "maxLength", js: "maxLength", typ: u(undefined, 0) },
        { json: "pattern", js: "pattern", typ: u(undefined, "") },
    ], false),
    "APIVersion": o([
        { json: "type", js: "type", typ: "" },
        { json: "const", js: "const", typ: "" },
        { json: "description", js: "description", typ: "" },
    ], false),
    "DataSpec": o([
        { json: "type", js: "type", typ: "" },
        { json: "description", js: "description", typ: "" },
        { json: "additionalProperties", js: "additionalProperties", typ: true },
        { json: "properties", js: "properties", typ: r("DataSpecProperties") },
    ], false),
    "DataSpecProperties": o([
        { json: "minEvents", js: "minEvents", typ: r("MaxEventsClass") },
        { json: "maxEvents", js: "maxEvents", typ: r("MaxEventsClass") },
        { json: "events", js: "events", typ: r("Events") },
    ], false),
    "Events": o([
        { json: "description", js: "description", typ: "" },
        { json: "oneOf", js: "oneOf", typ: a(r("EventsOneOf")) },
    ], false),
    "EventsOneOf": o([
        { json: "type", js: "type", typ: "" },
        { json: "const", js: "const", typ: u(undefined, "") },
        { json: "description", js: "description", typ: "" },
        { json: "minItems", js: "minItems", typ: u(undefined, 0) },
        { json: "uniqueItems", js: "uniqueItems", typ: u(undefined, true) },
        { json: "items", js: "items", typ: u(undefined, r("LlmPrompt")) },
    ], false),
    "MaxEventsClass": o([
        { json: "type", js: "type", typ: "" },
        { json: "minimum", js: "minimum", typ: 0 },
        { json: "description", js: "description", typ: "" },
    ], false),
    "Trigger": o([
        { json: "type", js: "type", typ: "" },
        { json: "description", js: "description", typ: "" },
        { json: "required", js: "required", typ: a("") },
        { json: "additionalProperties", js: "additionalProperties", typ: true },
        { json: "properties", js: "properties", typ: r("TriggerProperties") },
        { json: "allOf", js: "allOf", typ: a(r("AllOf")) },
    ], false),
    "AllOf": o([
        { json: "if", js: "if", typ: r("If") },
        { json: "then", js: "then", typ: r("Then") },
    ], false),
    "If": o([
        { json: "properties", js: "properties", typ: r("IfProperties") },
        { json: "required", js: "required", typ: a("") },
    ], false),
    "IfProperties": o([
        { json: "mode", js: "mode", typ: r("PurpleMode") },
    ], false),
    "PurpleMode": o([
        { json: "const", js: "const", typ: "" },
    ], false),
    "Then": o([
        { json: "required", js: "required", typ: a("") },
    ], false),
    "TriggerProperties": o([
        { json: "mode", js: "mode", typ: r("FluffyMode") },
        { json: "schedule", js: "schedule", typ: r("Schedule") },
    ], false),
    "FluffyMode": o([
        { json: "type", js: "type", typ: "" },
        { json: "enum", js: "enum", typ: a("") },
        { json: "description", js: "description", typ: "" },
    ], false),
    "Schedule": o([
        { json: "description", js: "description", typ: "" },
        { json: "oneOf", js: "oneOf", typ: a(r("ScheduleOneOf")) },
    ], false),
    "ScheduleOneOf": o([
        { json: "type", js: "type", typ: "" },
        { json: "enum", js: "enum", typ: u(undefined, a("")) },
        { json: "description", js: "description", typ: "" },
        { json: "additionalProperties", js: "additionalProperties", typ: u(undefined, true) },
        { json: "required", js: "required", typ: u(undefined, a("")) },
        { json: "properties", js: "properties", typ: u(undefined, r("OneOfProperties")) },
    ], false),
    "OneOfProperties": o([
        { json: "cron", js: "cron", typ: r("LlmPrompt") },
    ], false),
    "Types1Properties": o([
        { json: "apiVersion", js: "apiVersion", typ: r("APIVersion") },
        { json: "kind", js: "kind", typ: r("APIVersion") },
        { json: "metadata", js: "metadata", typ: r("Metadata") },
        { json: "spec", js: "spec", typ: r("SpecClass") },
    ], false),
    "Metadata": o([
        { json: "type", js: "type", typ: "" },
        { json: "description", js: "description", typ: "" },
        { json: "required", js: "required", typ: a("") },
        { json: "additionalProperties", js: "additionalProperties", typ: true },
        { json: "properties", js: "properties", typ: r("MetadataProperties") },
    ], false),
    "MetadataProperties": o([
        { json: "name", js: "name", typ: r("LlmPrompt") },
        { json: "displayName", js: "displayName", typ: r("LlmPrompt") },
        { json: "description", js: "description", typ: r("LlmPrompt") },
    ], false),
    "SpecClass": o([
        { json: "description", js: "description", typ: "" },
        { json: "oneOf", js: "oneOf", typ: a(r("SpecOneOf")) },
    ], false),
    "SpecOneOf": o([
        { json: "$ref", js: "$ref", typ: "" },
    ], false),
};
