import test from 'node:test';
import assert from 'node:assert/strict';
import { getMainContentClassName } from '../src/lib/mainLayoutStyles.js';

test('main content keeps the foreground text token in every sidebar state', () => {
  for (const sidebarOpen of [true, false]) {
    const classes = getMainContentClassName(sidebarOpen).split(/\s+/);
    assert.ok(classes.includes('text-foreground'));
  }
});
