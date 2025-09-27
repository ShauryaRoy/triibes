#!/usr/bin/env node
try {
  require('@rollup/rollup-linux-x64-gnu');
  console.log('[rollup check] Native binary present');
  process.exit(0);
} catch (e) {
  console.warn('[rollup check] Native binary missing');
  process.exit(1);
}
