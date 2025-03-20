import fs from 'fs-extra';
import path from 'path';

const JSON_DIR = 'json-project';

async function buildStructureJSON(dirs, files) {
  await fs.ensureDir(JSON_DIR);
  const structure = {};

  // Парсинг директорий
  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (await fs.pathExists(dirPath)) {
      const parsedDir = await parseStructure(dirPath);
      structure[path.basename(dir)] = parsedDir;
    } else {
      console.warn(`Directory ${dir} not found: ${dir}`);
    }
  }

  // Парсинг файлов
  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    if (await fs.pathExists(filePath)) {
      structure[file] = file.replace(/\\/g, '/');
    } else {
      console.warn(`File ${file} not found: ${file}`);
    }
  }

  // Минимизация JSON
  const structureJSON = JSON.stringify(structure);

  // Удаление лишних пробелов и переносов строк
  const minifiedStructureJSON = structureJSON.replace(/\s+/g, ' ');

  await fs.writeFile(path.join(JSON_DIR, 'project-structure.min.json'), minifiedStructureJSON);
  console.log('project-structure.min.json created successfully!');
}

async function parseStructure(dir) {
  const structure = {};
  const files = await fs.readdir(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      structure[file] = await parseStructure(filePath);
    } else {
      structure[file] = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    }
  }

  return structure;
}

async function main() {
  const dirs = ['src', 'server', 'supabase/migrations'];
  const files = ['package.json', 'redis.conf', 'README.md'];
  await buildStructureJSON(dirs, files);
}

main();