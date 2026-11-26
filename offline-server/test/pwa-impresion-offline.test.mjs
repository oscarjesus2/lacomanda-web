import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('la aplicación predescarga los recursos que QZ necesita para funcionar sin internet', async () => {
  const config = JSON.parse(await readFile(new URL('../../ngsw-config.json', import.meta.url), 'utf8'));
  const grupo = config.assetGroups.find(item => item.name === 'app');
  assert.equal(grupo.installMode, 'prefetch');
  assert.ok(!grupo.resources.files.includes('/assets/signing/private-key.pem'));
  assert.ok(config.assetGroups.some(g => g.installMode === 'lazy' && g.resources.files.includes('/assets/**')));
  assert.ok(grupo.resources.files.includes('/*.js'));
  const index = await readFile(new URL('../../src/index.html', import.meta.url), 'utf8');
  const script = /<script src="([^"]*qz-tray\.js)"/.exec(index)?.[1];
  assert.ok(script?.startsWith('/assets/'));
  assert.ok(grupo.resources.files.includes(script));
  const conector = await readFile(new URL('../../src' + script, import.meta.url), 'utf8');
  assert.match(conector, /QZ Tray Connector/);
});
