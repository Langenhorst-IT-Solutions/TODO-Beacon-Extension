import * as assert from 'assert';
import * as vscode from 'vscode';
import { tagColor, tagIcon, TAG_STYLES } from '../../tagStyles';

suite('tagStyles', () => {
  // ─── tagColor ────────────────────────────────────────────────────────────

  test('tagColor returns a ThemeColor for a known tag', () => {
    const color = tagColor('TODO');
    assert.ok(color instanceof vscode.ThemeColor);
  });

  test('tagColor uses the correct colorId for TODO', () => {
    const color = tagColor('TODO') as unknown as { id: string };
    assert.strictEqual(color.id, 'todoBeacon.todoForeground');
  });

  test('tagColor is case-insensitive', () => {
    const upper = tagColor('FIXME') as unknown as { id: string };
    const lower = tagColor('fixme') as unknown as { id: string };
    assert.strictEqual(upper.id, lower.id);
  });

  test('tagColor falls back to todoForeground for an unknown tag', () => {
    const color = tagColor('UNKNOWN_TAG_XYZ') as unknown as { id: string };
    assert.strictEqual(color.id, 'todoBeacon.todoForeground');
  });

  test('tagColor uses distinct colorIds for different known tags', () => {
    const todo = tagColor('TODO') as unknown as { id: string };
    const bug = tagColor('BUG') as unknown as { id: string };
    assert.notStrictEqual(todo.id, bug.id);
  });

  // ─── tagIcon ─────────────────────────────────────────────────────────────

  test('tagIcon returns a ThemeIcon for a known tag', () => {
    const icon = tagIcon('TODO');
    assert.ok(icon instanceof vscode.ThemeIcon);
  });

  test('tagIcon uses the correct codicon for BUG', () => {
    const icon = tagIcon('BUG') as unknown as { id: string };
    assert.strictEqual(icon.id, 'bug');
  });

  test('tagIcon uses the correct codicon for FIXME', () => {
    const icon = tagIcon('FIXME') as unknown as { id: string };
    assert.strictEqual(icon.id, 'tools');
  });

  test('tagIcon uses the correct codicon for NOTE', () => {
    const icon = tagIcon('NOTE') as unknown as { id: string };
    assert.strictEqual(icon.id, 'note');
  });

  test('tagIcon uses the correct codicon for WARNING', () => {
    const icon = tagIcon('WARNING') as unknown as { id: string };
    assert.strictEqual(icon.id, 'warning');
  });

  test('tagIcon uses the correct codicon for DEPRECATED', () => {
    const icon = tagIcon('DEPRECATED') as unknown as { id: string };
    assert.strictEqual(icon.id, 'archive');
  });

  test('tagIcon falls back to circle-outline for an unknown tag', () => {
    const icon = tagIcon('NONEXISTENT') as unknown as { id: string };
    assert.strictEqual(icon.id, 'circle-outline');
  });

  test('tagIcon is case-insensitive', () => {
    const upper = tagIcon('TODO') as unknown as { id: string };
    const lower = tagIcon('todo') as unknown as { id: string };
    assert.strictEqual(upper.id, lower.id);
  });

  // ─── TAG_STYLES export ────────────────────────────────────────────────────

  test('TAG_STYLES contains entries for all expected tags', () => {
    const expected = ['TODO', 'FIXME', 'BUG', 'NOTE', 'WARNING', 'DEPRECATED', 'XXX'];
    for (const tag of expected) {
      assert.ok(TAG_STYLES[tag], `TAG_STYLES missing entry for ${tag}`);
    }
  });

  test('each TAG_STYLES entry has icon, colorId, and defaultColor', () => {
    for (const [tag, style] of Object.entries(TAG_STYLES)) {
      assert.ok(style.icon, `${tag} missing icon`);
      assert.ok(style.colorId, `${tag} missing colorId`);
      assert.ok(style.defaultColor, `${tag} missing defaultColor`);
    }
  });
});
