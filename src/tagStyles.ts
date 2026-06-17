import * as vscode from 'vscode';

interface TagStyle {
  /** Codicon id (without the `$()` wrapper). */
  icon: string;
  /** id of the matching `contributes.colors` entry in package.json. */
  colorId: string;
  /** Default hex color, used as the fallback in package.json's color contribution. */
  defaultColor: string;
}

// Single source of truth for tag → icon/color. Mirrors the table in
// ROADMAP.md ("Planned: tag colors") and package.json's `contributes.colors`.
const TAG_STYLES: Record<string, TagStyle> = {
  TODO: { icon: 'circle-outline', colorId: 'todoBeacon.todoForeground', defaultColor: '#3794FF' },
  FIXME: { icon: 'tools', colorId: 'todoBeacon.fixmeForeground', defaultColor: '#E2A33D' },
  BUG: { icon: 'bug', colorId: 'todoBeacon.bugForeground', defaultColor: '#F14C4C' },
  HACK: { icon: 'flame', colorId: 'todoBeacon.hackForeground', defaultColor: '#FFB454' },
  NOTE: { icon: 'note', colorId: 'todoBeacon.noteForeground', defaultColor: '#89D185' },
  TEST: { icon: 'beaker', colorId: 'todoBeacon.testForeground', defaultColor: '#B180D7' },
  DEBUG: { icon: 'terminal', colorId: 'todoBeacon.debugForeground', defaultColor: '#D16AD1' },
  OPTIMIZE: { icon: 'dashboard', colorId: 'todoBeacon.optimizeForeground', defaultColor: '#FFB454' },
  PERF: { icon: 'dashboard', colorId: 'todoBeacon.optimizeForeground', defaultColor: '#FFB454' },
  REVIEW: { icon: 'eye', colorId: 'todoBeacon.reviewForeground', defaultColor: '#F783AC' },
  IDEA: { icon: 'lightbulb', colorId: 'todoBeacon.ideaForeground', defaultColor: '#4EC9B0' },
  WARNING: { icon: 'warning', colorId: 'todoBeacon.warningForeground', defaultColor: '#FF8C00' },
  WARN: { icon: 'warning', colorId: 'todoBeacon.warningForeground', defaultColor: '#FF8C00' },
  DEPRECATED: { icon: 'archive', colorId: 'todoBeacon.deprecatedForeground', defaultColor: '#888888' },
  XXX: { icon: 'error', colorId: 'todoBeacon.xxxForeground', defaultColor: '#F44747' },
};

const FALLBACK_STYLE: TagStyle = {
  icon: 'circle-outline',
  colorId: 'todoBeacon.todoForeground',
  defaultColor: '#3794FF',
};

function styleFor(tag: string): TagStyle {
  return TAG_STYLES[tag.toUpperCase()] ?? FALLBACK_STYLE;
}

/** Themed color for a tag, adapting to the active color theme. */
export function tagColor(tag: string): vscode.ThemeColor {
  return new vscode.ThemeColor(styleFor(tag).colorId);
}

/** Icon (with its matching color) for a tag, for use in tree views. */
export function tagIcon(tag: string): vscode.ThemeIcon {
  const style = styleFor(tag);
  return new vscode.ThemeIcon(style.icon, new vscode.ThemeColor(style.colorId));
}

export { TAG_STYLES };
