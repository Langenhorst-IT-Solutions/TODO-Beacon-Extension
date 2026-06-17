import * as assert from 'assert';
import { MarkdownTaskParser } from '../../parser/MarkdownTaskParser';

suite('MarkdownTaskParser', () => {
  const parser = new MarkdownTaskParser();

  test('returns empty array for empty content', () => {
    assert.deepStrictEqual(parser.parse(''), []);
  });

  test('parses heading as project', () => {
    const result = parser.parse('## Work\n- [ ] Task one');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Work');
  });

  test('parses open checkbox', () => {
    const result = parser.parse('## P\n- [ ] open task');
    assert.strictEqual(result[0].tasks[0].status, 'open');
    assert.strictEqual(result[0].tasks[0].text, 'open task');
  });

  test('parses done checkbox lowercase x', () => {
    const result = parser.parse('## P\n- [x] done task');
    assert.strictEqual(result[0].tasks[0].status, 'done');
  });

  test('parses done checkbox uppercase X', () => {
    const result = parser.parse('## P\n- [X] done task');
    assert.strictEqual(result[0].tasks[0].status, 'done');
  });

  test('parses cancelled checkbox with dash', () => {
    const result = parser.parse('## P\n- [-] cancelled task');
    assert.strictEqual(result[0].tasks[0].status, 'cancelled');
  });

  test('ignores non-checkbox list items', () => {
    const result = parser.parse('## P\n- plain list item without checkbox');
    assert.strictEqual(result[0].tasks.length, 0);
  });

  test('handles multiple headings as separate projects', () => {
    const content = '## Work\n- [ ] A\n## Personal\n- [x] B';
    const result = parser.parse(content);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].name, 'Work');
    assert.strictEqual(result[1].name, 'Personal');
    assert.strictEqual(result[1].tasks[0].status, 'done');
  });

  test('handles tasks before any heading (orphan tasks)', () => {
    const result = parser.parse('- [ ] no heading task');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, '');
  });

  test('extracts stable ID from task text', () => {
    const result = parser.parse('## P\n- [ ] refactor loop (#7f3a)');
    assert.strictEqual(result[0].tasks[0].id, '7f3a');
    assert.strictEqual(result[0].tasks[0].text, 'refactor loop');
  });

  test('handles CRLF line endings', () => {
    const result = parser.parse('## P\r\n- [ ] task A\r\n- [x] task B');
    assert.strictEqual(result[0].tasks.length, 2);
  });

  test('handles all heading levels', () => {
    const content = '# H1\n- [ ] A\n## H2\n- [ ] B\n### H3\n- [ ] C';
    const result = parser.parse(content);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'H1');
    assert.strictEqual(result[0].children[0].name, 'H2');
    assert.strictEqual(result[0].children[0].children[0].name, 'H3');
  });

  // ─── Heading hierarchy ───────────────────────────────────────────────────

  test('nests a deeper heading under the preceding shallower heading', () => {
    const content = '# Work\n## Subsection\n- [ ] task';
    const result = parser.parse(content);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Work');
    assert.strictEqual(result[0].children.length, 1);
    assert.strictEqual(result[0].children[0].name, 'Subsection');
    assert.strictEqual(result[0].children[0].tasks[0].text, 'task');
  });

  test('keeps same-level headings as siblings, not nested', () => {
    const content = '## Work\n## Personal';
    const result = parser.parse(content);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].children.length, 0);
  });

  test('returns to the correct ancestor after a deeper section ends', () => {
    const content = '# A\n## A1\n- [ ] x\n# B\n- [ ] y';
    const result = parser.parse(content);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].name, 'A');
    assert.strictEqual(result[0].children[0].name, 'A1');
    assert.strictEqual(result[1].name, 'B');
    assert.strictEqual(result[1].tasks[0].text, 'y');
  });

  test('a heading one level shallower closes a deeper sibling section', () => {
    const content = '# A\n### Deep\n- [ ] x\n## Shallower\n- [ ] y';
    const result = parser.parse(content);
    assert.strictEqual(result[0].children.length, 2);
    assert.strictEqual(result[0].children[0].name, 'Deep');
    assert.strictEqual(result[0].children[1].name, 'Shallower');
  });
});
