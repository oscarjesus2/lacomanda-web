const fs = require('fs');
const path = require('path');

// Ruta del changelog general
const changelogPath = path.join(__dirname, '../CHANGELOG.md');
const changelogContent = fs.readFileSync(changelogPath, 'utf8');

// Función para actualizar el changelog de un entorno
function updateChangelog(env) {
    const envChangelogPath = path.join(__dirname, `../changelogs/${env}-changelog.md`);
    fs.appendFileSync(envChangelogPath, changelogContent); // Añadir contenido al changelog del entorno
    console.log(`Changelog actualizado para ${env}`);

    fs.writeFileSync(changelogPath, ''); // Dejar el archivo vacío
    console.log(`CHANGELOG.md limpiado.`);
}

// Verifica si se pasa el entorno como argumento
const environment = process.argv[2]; // Recibe el entorno como argumento (development, testing, production)
if (environment) {
    updateChangelog(environment);
} else {
    console.error('Por favor, proporciona un entorno (development, testing, production).');
    process.exit(1);
}
