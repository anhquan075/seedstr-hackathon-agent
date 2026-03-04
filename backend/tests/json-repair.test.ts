import { repairJSON } from '../src/agent/json-repair';

describe('JSON Repair Engine', () => {
  describe('Strategy 1: Direct Parse', () => {
    test('should parse valid JSON objects', () => {
      const input = '{"name": "John", "age": 30}';
      const result = repairJSON(input);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    test('should parse valid JSON arrays', () => {
      const input = '[1, 2, 3, 4, 5]';
      const result = repairJSON(input);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('should handle nested objects', () => {
      const input = '{"user": {"name": "Jane", "email": "jane@example.com"}, "active": true}';
      const result = repairJSON(input);
      expect(result).toEqual({
        user: { name: 'Jane', email: 'jane@example.com' },
        active: true,
      });
    });

    test('should handle double-encoded JSON strings', () => {
      const input = '"{\\\"key\\\": \\\"value\\\"}"';
      const result = repairJSON(input);
      expect(result).toEqual({ key: 'value' });
    });

    test('should parse JSON with null values', () => {
      const input = '{"name": null, "age": 25}';
      const result = repairJSON(input);
      expect(result).toEqual({ name: null, age: 25 });
    });

    test('should parse JSON with boolean values', () => {
      const input = '{"active": true, "verified": false}';
      const result = repairJSON(input);
      expect(result).toEqual({ active: true, verified: false });
    });
  });

  describe('Strategy 2: Markdown Code Fences', () => {
    test('should remove markdown json code fence', () => {
      const input = '```json\n{"name": "John"}\n```';
      const result = repairJSON(input);
      expect(result).toEqual({ name: 'John' });
    });

    test('should remove markdown code fence without json label', () => {
      const input = '```\n{"status": "success"}\n```';
      const result = repairJSON(input);
      expect(result).toEqual({ status: 'success' });
    });

    test('should handle code fence with extra whitespace', () => {
      const input = '  ```json  \n  {"data": [1, 2, 3]}  \n  ```  ';
      const result = repairJSON(input);
      expect(result).toEqual({ data: [1, 2, 3] });
    });

    test('should handle nested arrays in code fence', () => {
      const input = '```\n[{"id": 1}, {"id": 2}]\n```';
      const result = repairJSON(input);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('Strategy 3: Extract JSON from Text', () => {
    test('should extract JSON object from surrounding text', () => {
      const input = 'Here is the data: {"name": "Alice"}';
      const result = repairJSON(input);
      expect(result).toEqual({ name: 'Alice' });
    });

    test('should extract JSON array from surrounding text', () => {
      const input = 'Results are: [1, 2, 3] as shown above';
      const result = repairJSON(input);
      expect(result).toEqual([1, 2, 3]);
    });

    test('should extract nested structure from text', () => {
      const input = 'Response: {"users": [{"name": "Bob"}, {"name": "Carol"}]}';
      const result = repairJSON(input);
      expect(result).toEqual({
        users: [{ name: 'Bob' }, { name: 'Carol' }],
      });
    });
  });

  describe('Strategy 4.1: Trailing Commas', () => {
    test('should fix trailing comma in object', () => {
      const input = '{"name": "John", "age": 30,}';
      const result = repairJSON(input);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    test('should fix trailing comma in array', () => {
      const input = '[1, 2, 3,]';
      const result = repairJSON(input);
      expect(result).toEqual([1, 2, 3]);
    });

    test('should fix multiple trailing commas', () => {
      const input = '{"a": 1, "b": 2,, "c": 3}';
      const result = repairJSON(input);
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    test('should fix trailing comma before closing bracket in nested array', () => {
      const input = '{"items": [1, 2, 3,],}';
      const result = repairJSON(input);
      expect(result).toEqual({ items: [1, 2, 3] });
    });
  });

  describe('Strategy 4.2: Unquoted Keys', () => {
    test('should fix unquoted keys in object', () => {
      const input = '{name: "John", age: 30}';
      const result = repairJSON(input);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    test('should fix multiple unquoted keys', () => {
      const input = '{firstName: "Jane", lastName: "Doe", email: "jane@example.com"}';
      const result = repairJSON(input);
      expect(result).toEqual({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      });
    });

    test('should handle unquoted keys with underscores', () => {
      const input = '{user_name: "alice", user_id: 123}';
      const result = repairJSON(input);
      expect(result).toEqual({ user_name: 'alice', user_id: 123 });
    });

    test('should handle unquoted keys with numbers', () => {
      const input = '{item1: "first", item2: "second"}';
      const result = repairJSON(input);
      expect(result).toEqual({ item1: 'first', item2: 'second' });
    });
  });

  describe('Strategy 4.3: Single Quotes for Keys', () => {
    test('should fix single-quoted keys', () => {
      const input = "{'name': 'John', 'age': 30}";
      const result = repairJSON(input);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    test('should fix mixed quoted keys', () => {
      const input = '{"active": true, \'status\': "online"}';
      const result = repairJSON(input);
      expect(result).toEqual({ active: true, status: 'online' });
    });
  });

  describe('Strategy 4.4: Single Quotes for Values', () => {
    test('should fix single-quoted string values', () => {
      const input = "{'name': 'John', 'city': 'New York'}";
      const result = repairJSON(input);
      expect(result).toEqual({ name: 'John', city: 'New York' });
    });

    test('should fix single quotes with nested values', () => {
      const input = "{'user': 'Alice', 'role': 'admin', 'active': true}";
      const result = repairJSON(input);
      expect(result).toEqual({ user: 'Alice', role: 'admin', active: true });
    });
  });

  describe('Strategy 4.5: Missing Commas Between Properties', () => {
    test('should fix missing comma between properties', () => {
      const input = '{"a": 1 "b": 2}';
      const result = repairJSON(input);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    test('should fix missing commas with string values', () => {
      const input = '{"name": "John" "age": 30 "city": "NYC"}';
      const result = repairJSON(input);
      expect(result).toEqual({ name: 'John', age: 30, city: 'NYC' });
    });

    test('should fix missing commas in arrays', () => {
      const input = '{"items": [1 2 3]}';
      const result = repairJSON(input);
      expect(result).toEqual({ items: [1, 2, 3] });
    });
  });

  describe('Strategy 4.6: Python-Style Constants', () => {
    test('should convert Python None to null', () => {
      const input = '{"value": None}';
      const result = repairJSON(input);
      expect(result).toEqual({ value: null });
    });

    test('should convert Python True to true', () => {
      const input = '{"active": True}';
      const result = repairJSON(input);
      expect(result).toEqual({ active: true });
    });

    test('should convert Python False to false', () => {
      const input = '{"verified": False}';
      const result = repairJSON(input);
      expect(result).toEqual({ verified: false });
    });

    test('should convert all Python constants in one object', () => {
      const input = '{"a": True, "b": False, "c": None}';
      const result = repairJSON(input);
      expect(result).toEqual({ a: true, b: false, c: null });
    });
  });

  describe('Strategy 4.7: Escaped Quotes', () => {
    test('should handle escaped quotes in stringified JSON', () => {
      const input = '"{\\\"key\\\": \\\"value\\\"}"';
      const result = repairJSON(input);
      expect(result).toEqual({ key: 'value' });
    });

    test('should handle complex escaped JSON', () => {
      const input = '"{\\\"users\\\": [{\\\"name\\\": \\\"Bob\\\"}]}"';
      const result = repairJSON(input);
      expect(result).toEqual({ users: [{ name: 'Bob' }] });
    });
  });

  describe('Combined/Complex Repairs', () => {
    test('should fix markdown fence + unquoted keys + trailing commas', () => {
      const input = '```json\n{name: "John", age: 30,}\n```';
      const result = repairJSON(input);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    test('should fix markdown fence + single quotes + missing commas', () => {
      const input = "```\n{'name': 'Alice' 'role': 'admin'}\n```";
      const result = repairJSON(input);
      expect(result).toEqual({ name: 'Alice', role: 'admin' });
    });

    test('should fix Python constants + unquoted keys + trailing commas', () => {
      const input = '{active: True, verified: False, value: None,}';
      const result = repairJSON(input);
      expect(result).toEqual({ active: true, verified: false, value: null });
    });

    test('should fix complex LLM output with multiple issues', () => {
      const input = '```json\n{name: "Alice", tags: [\'python\' \'js\'] activated: True,}\n```';
      const result = repairJSON(input);
      expect(result).toEqual({
        name: 'Alice',
        tags: ['python', 'js'],
        activated: true,
      });
    });

    test('should handle deeply nested structure with multiple repairs', () => {
      const input = `{
        "user": {
          name: "Charlie"
          "roles": ["admin" "user"]
          active: True,
        }
      }`;
      const result = repairJSON(input);
      expect(result).toEqual({
        user: {
          name: 'Charlie',
          roles: ['admin', 'user'],
          active: true,
        },
      });
    });

    test('should fix array of objects with mixed issues', () => {
      const input = "[{id: 1, name: 'first',} {id: 2, name: 'second'}]";
      const result = repairJSON(input);
      expect(result).toEqual([
        { id: 1, name: 'first' },
        { id: 2, name: 'second' },
      ]);
    });

    test('should extract and repair JSON from wrapped text', () => {
      const input =
        'The response is: ```{"user": {"name": "Dave" "verified": True}}``` which is correct';
      const result = repairJSON(input);
      expect(result).toEqual({
        user: { name: 'Dave', verified: true },
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty objects', () => {
      const input = '{}';
      const result = repairJSON(input);
      expect(result).toEqual({});
    });

    test('should handle empty arrays', () => {
      const input = '[]';
      const result = repairJSON(input);
      expect(result).toEqual([]);
    });

    test('should handle numeric values', () => {
      const input = '{"int": 42, "float": 3.14, "negative": -10}';
      const result = repairJSON(input);
      expect(result).toEqual({ int: 42, float: 3.14, negative: -10 });
    });

    test('should handle special string characters', () => {
      const input = '{"text": "Hello\\nWorld\\t!", "email": "test@example.com"}';
      const result = repairJSON(input);
      expect(result).toEqual({
        text: 'Hello\nWorld\t!',
        email: 'test@example.com',
      });
    });

    test('should throw error for completely unparseable input', () => {
      const input = 'not json at all';
      expect(() => repairJSON(input)).toThrow('Failed to repair JSON');
    });
  });

  describe('Real-World LLM Outputs', () => {
    test('should repair Claude-style output with markdown', () => {
      const input = `\`\`\`json
{
  "analysis": "Complete",
  "results": ["item1" "item2"]
  "confidence": 0.95,
}
\`\`\``;
      const result = repairJSON(input);
      expect(result).toEqual({
        analysis: 'Complete',
        results: ['item1', 'item2'],
        confidence: 0.95,
      });
    });

    test('should repair GPT-style output with Python constants', () => {
      const input = `{
        "success": True,
        "data": {
          active: true,
          items: [1, 2, 3],
          meta: None
        }
      }`;
      const result = repairJSON(input);
      expect(result).toEqual({
        success: true,
        data: {
          active: true,
          items: [1, 2, 3],
          meta: null,
        },
      });
    });

    test('should repair stringified JSON response', () => {
      const input = '"{\\\"status\\\": \\\"success\\\", \\\"id\\\": 123}"';
      const result = repairJSON(input);
      expect(result).toEqual({ status: 'success', id: 123 });
    });

    test('should repair mixed quote types output', () => {
      const input = `{
        'user': "John"
        'settings': {
          'dark_mode': True,
          'notifications': False
        }
      }`;
      const result = repairJSON(input);
      expect(result).toEqual({
        user: 'John',
        settings: {
          dark_mode: true,
          notifications: false,
        },
      });
    });
  });

  describe('Robustness Tests', () => {
    test('should handle whitespace variations', () => {
      const input = '{  "a"  :  1  ,  "b"  :  2  }';
      const result = repairJSON(input);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    test('should handle tabs and newlines', () => {
      const input = '{\n\t"name": "test",\n\t"value": 42\n}';
      const result = repairJSON(input);
      expect(result).toEqual({ name: 'test', value: 42 });
    });

    test('should handle mixed case JSON booleans', () => {
      const input = '{active: true, verified: false}';
      const result = repairJSON(input);
      expect(result).toEqual({ active: true, verified: false });
    });

    test('should preserve numeric string values', () => {
      const input = '{"code": "123", "id": 123}';
      const result = repairJSON(input);
      expect(result).toEqual({ code: '123', id: 123 });
    });
  });
});
