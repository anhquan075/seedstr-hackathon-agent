#!/usr/bin/env npx ts-node
// Test runner for JSON repair validation
// Runs without Jest dependencies for quick validation

import { repairJSON } from './src/agent/json-repair.js';

interface TestCase {
  name: string;
  input: string;
  expected?: unknown;
  shouldThrow?: boolean;
}

interface TestGroup {
  name: string;
  cases: TestCase[];
}

const testGroups: TestGroup[] = [
  {
    name: 'Strategy 1: Direct Parse',
    cases: [
      { name: 'Valid JSON object', input: '{"name": "John", "age": 30}', expected: { name: 'John', age: 30 } },
      { name: 'Valid JSON array', input: '[1, 2, 3]', expected: [1, 2, 3] },
      { name: 'Nested objects', input: '{"user": {"name": "Jane"}}', expected: { user: { name: 'Jane' } } },
      { name: 'Null values', input: '{"value": null}', expected: { value: null } },
      { name: 'Boolean values', input: '{"active": true, "verified": false}', expected: { active: true, verified: false } },
    ],
  },
  {
    name: 'Strategy 2: Markdown Code Fences',
    cases: [
      { name: 'JSON code fence', input: '```json\n{"name": "John"}\n```', expected: { name: 'John' } },
      { name: 'Plain code fence', input: '```\n{"status": "ok"}\n```', expected: { status: 'ok' } },
      { name: 'Array in code fence', input: '```\n[1, 2, 3]\n```', expected: [1, 2, 3] },
    ],
  },
  {
    name: 'Strategy 3: Extract JSON from Text',
    cases: [
      { name: 'Extract from text', input: 'Data: {"name": "Alice"}', expected: { name: 'Alice' } },
      { name: 'Array from text', input: 'Results: [1, 2] done', expected: [1, 2] },
    ],
  },
  {
    name: 'Strategy 4.1: Trailing Commas',
    cases: [
      { name: 'Trailing comma in object', input: '{"name": "John",}', expected: { name: 'John' } },
      { name: 'Trailing comma in array', input: '[1, 2,]', expected: [1, 2] },
    ],
  },
  {
    name: 'Strategy 4.2: Unquoted Keys',
    cases: [
      { name: 'Unquoted keys', input: '{name: "John", age: 30}', expected: { name: 'John', age: 30 } },
      { name: 'Keys with underscores', input: '{user_name: "alice"}', expected: { user_name: 'alice' } },
    ],
  },
  {
    name: 'Strategy 4.3: Single Quotes for Keys',
    cases: [
      { name: 'Single-quoted keys', input: "{'name': 'John'}", expected: { name: 'John' } },
    ],
  },
  {
    name: 'Strategy 4.6: Python Constants',
    cases: [
      { name: 'Python None', input: '{"value": None}', expected: { value: null } },
      { name: 'Python True', input: '{"active": True}', expected: { active: true } },
      { name: 'Python False', input: '{"verified": False}', expected: { verified: false } },
      { name: 'All Python constants', input: '{"a": True, "b": False, "c": None}', expected: { a: true, b: false, c: null } },
    ],
  },
  {
    name: 'Combined/Complex Repairs',
    cases: [
      { name: 'Markdown + unquoted + trailing comma', input: '```json\n{name: "John",}\n```', expected: { name: 'John' } },
      { name: 'Unquoted + Python True + trailing', input: '{active: True, name: "test",}', expected: { active: true, name: 'test' } },
      { name: 'Markdown + Python constants', input: '```json\n{a: True, b: False, c: None}\n```', expected: { a: true, b: false, c: null } },
    ],
  },
  {
    name: 'Edge Cases',
    cases: [
      { name: 'Empty object', input: '{}', expected: {} },
      { name: 'Empty array', input: '[]', expected: [] },
      { name: 'Numeric values', input: '{"int": 42, "float": 3.14}', expected: { int: 42, float: 3.14 } },
      { name: 'Unparseable input', input: 'not json at all', shouldThrow: true },
    ],
  },
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

console.log('\n📋 JSON Repair Test Suite\n');
console.log('='.repeat(70));

for (const group of testGroups) {
  console.log(`\n✓ ${group.name}`);
  console.log('-'.repeat(70));

  for (const testCase of group.cases) {
    totalTests++;
    try {
      const result = repairJSON(testCase.input);
      if (testCase.shouldThrow) {
        console.log(`  ✗ ${testCase.name} - Expected to throw but got result`);
        failedTests++;
      } else if (deepEqual(result, testCase.expected)) {
        console.log(`  ✓ ${testCase.name}`);
        passedTests++;
      } else {
        console.log(`  ✗ ${testCase.name}`);
        console.log(`    Expected: ${JSON.stringify(testCase.expected)}`);
        console.log(`    Got:      ${JSON.stringify(result)}`);
        failedTests++;
      }
    } catch (error) {
      if (testCase.shouldThrow) {
        console.log(`  ✓ ${testCase.name} (threw as expected)`);
        passedTests++;
      } else {
        console.log(`  ✗ ${testCase.name}`);
        console.log(`    Error: ${error instanceof Error ? error.message : String(error)}`);
        failedTests++;
      }
    }
  }
}

console.log('\n' + '='.repeat(70));
console.log('\n📊 Test Results');
console.log(`  Total:  ${totalTests} tests`);
console.log(`  Passed: ${passedTests} ✓`);
console.log(`  Failed: ${failedTests} ✗`);
console.log(`  Status: ${failedTests === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

const percentage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
console.log(`  Pass Rate: ${percentage}%\n`);

process.exit(failedTests > 0 ? 1 : 0);
