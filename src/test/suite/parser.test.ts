import * as assert from 'assert';
import { TaskPaperParser } from '../../parser/TaskPaperParser';

suite('TaskPaperParser', () => {
  const parser = new TaskPaperParser();

  test('returns empty array for empty content', () => {
    assert.deepStrictEqual(parser.parse(''), []);
  });

  test('returns empty array for whitespace-only content', () => {
    assert.deepStrictEqual(parser.parse('   \n   \n'), []);
  });

  test('parses a project with tasks', () => {
    const result = parser.parse('Work:\n- Fix bug\n- Write tests');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Work');
    assert.strictEqual(result[0].tasks.length, 2);
    assert.strictEqual(result[0].tasks[0].text, 'Fix bug');
    assert.strictEqual(result[0].tasks[0].status, 'open');
  });

  test('parses @done tag as done status', () => {
    const result = parser.parse('Project:\n- Task one @done');
    assert.strictEqual(result[0].tasks[0].status, 'done');
  });

  test('parses @cancelled tag as cancelled status', () => {
    const result = parser.parse('Project:\n- Task one @cancelled');
    assert.strictEqual(result[0].tasks[0].status, 'cancelled');
  });

  test('parses @tags with values', () => {
    const result = parser.parse('Project:\n- Task @today @due(2026-07-01)');
    const task = result[0].tasks[0];
    assert.strictEqual(task.tags['today'], true);
    assert.strictEqual(task.tags['due'], '2026-07-01');
  });

  test('strips @tags from task text', () => {
    const result = parser.parse('Project:\n- Fix bug @today @done');
    assert.strictEqual(result[0].tasks[0].text, 'Fix bug');
  });

  test('extracts stable ID from task text', () => {
    const result = parser.parse('Project:\n- Fix bug (#7f3a)');
    assert.strictEqual(result[0].tasks[0].id, '7f3a');
    assert.strictEqual(result[0].tasks[0].text, 'Fix bug');
  });

  test('handles multiple projects', () => {
    const content = 'Work:\n- Task A\nPersonal:\n- Task B\n- Task C';
    const result = parser.parse(content);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].name, 'Work');
    assert.strictEqual(result[1].name, 'Personal');
    assert.strictEqual(result[1].tasks.length, 2);
  });

  test('handles orphan tasks without a project', () => {
    const result = parser.parse('- Orphan task');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, '');
    assert.strictEqual(result[0].tasks[0].text, 'Orphan task');
  });

  test('skips comment lines starting with //', () => {
    const result = parser.parse('// This is a comment\nProject:\n- Task');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].tasks.length, 1);
  });

  test('handles Windows CRLF line endings', () => {
    const result = parser.parse('Project:\r\n- Task A\r\n- Task B');
    assert.strictEqual(result[0].tasks.length, 2);
  });
});
