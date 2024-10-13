const { version } = require('../package.json'); // Cambia a ruta correcta
const { writeFileSync } = require('fs');
const { join } = require('path');

// Ruta donde se generará el archivo version.ts
const versionFilePath = join(__dirname, 'src', 'environments', 'version.ts');

// Contenido que se va a escribir en version.ts
const content = `export const version = '${version}';\n`;

// Escribir el archivo version.ts
writeFileSync(versionFilePath, content, { encoding: 'utf8' });

console.log(`Version ${version} written to ${versionFilePath}`);
