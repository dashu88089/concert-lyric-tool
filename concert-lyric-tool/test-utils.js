import fs from 'fs';

/**
 * Load a vanilla JS file (no export/import) into the global scope
 * using indirect eval. Function declarations become globals accessible
 * via `globalThis`.
 */
export function loadVanillaJs(absolutePath) {
  const code = fs.readFileSync(absolutePath, 'utf-8');
  // Indirect eval via globalThis — runs code in global scope (sloppy mode by default)
  // Top-level `function` declarations create global properties.
  // `const`/`let` are scoped to the eval but accessible to functions defined within it.
  globalThis.eval(code);
}
