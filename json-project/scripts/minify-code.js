import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';
import chalk from 'chalk';
import cursor from 'cli-cursor';

const SAVES_DIR = path.join('json-project', 'minify-saves');
const JSON_DIR = 'json-project';
async function minifyCode() {
    await fs.ensureDir(JSON_DIR); // Добавлено
    await fs.ensureDir(SAVES_DIR);
    const saveFiles = await fs.readdir(SAVES_DIR);
  
    if (saveFiles.length > 0 && await loadSave(saveFiles)) {
      return;
    }
  
    const structure = await fs.readJson(path.join(JSON_DIR, 'project-structure.min.json')); // Изменено
    const filePaths = getFilePaths(structure);
  
    const selectedFiles = await interactiveSelect(filePaths);
    const code = await readFiles(selectedFiles);
  
    // Минимизация JSON
    const codeJSON = JSON.stringify(code);
  
    // Удаление лишних пробелов и переносов строк
    const minifiedCodeJSON = codeJSON.replace(/\s+/g, ' ');
  
    await fs.writeFile(path.join(JSON_DIR, 'project-code.min.json'), minifiedCodeJSON); // Изменено
    console.log(chalk.green('project-code.min.json created successfully!'));
  }
  
  async function loadSave(saveFiles) {
    const selectedSave = await interactiveSelectSave(saveFiles);
    if (!selectedSave) return false;
  
    const savePath = path.join(SAVES_DIR, selectedSave);
    const selectedFiles = await fs.readJson(savePath);
    const code = await readFiles(selectedFiles);
  
    // Минимизация JSON
    const codeJSON = JSON.stringify(code);
  
    // Удаление лишних пробелов и переносов строк
    const minifiedCodeJSON = codeJSON.replace(/\s+/g, ' ');
  
    await fs.writeFile(path.join(JSON_DIR, 'project-code.min.json'), minifiedCodeJSON); // Изменено
    console.log(chalk.green('project-code.min.json created successfully!'));
    return true;
  }

async function interactiveSelectSave(saveFiles) {
  return new Promise((resolve) => {
    if (saveFiles.length === 0) {
      resolve(null);
      return;
    }

    const selected = new Array(saveFiles.length).fill(false);
    let cursorIndex = 0;

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    function printList() {
      console.clear();
      console.log(chalk.bold('Select save to load:'));
      saveFiles.forEach((saveFile, index) => {
        const checkbox = selected[index] ? chalk.green('[x]') : '[ ]';
        const indicator = index === cursorIndex ? chalk.cyan('>') : ' ';
        const coloredSaveFile = index === cursorIndex ? chalk.cyan(saveFile) : saveFile;
        console.log(`${indicator} ${checkbox} ${coloredSaveFile}`);
      });
      console.log(chalk.bold('New selection'));
    }

    printList();
    cursor.hide();

    rl.input.on('keypress', (str, key) => {
      switch (key.name) {
        case 'up':
          cursorIndex = Math.max(0, cursorIndex - 1);
          break;
        case 'down':
          cursorIndex = Math.min(saveFiles.length, cursorIndex + 1);
          break;
        case 'space':
          selected[cursorIndex] = !selected[cursorIndex];
          break;
        case 'return':
          rl.close();
          cursor.show();
          if (cursorIndex === saveFiles.length) {
            resolve(null);
          } else {
            resolve(saveFiles[cursorIndex]);
          }
          return;
        case 'c' && key.ctrl:
          rl.close();
          cursor.show();
          process.exit();
          return;
      }
      printList();
    });
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
  });
}

function getFilePaths(structure, base = '') {
  let paths = [];
  for (const key in structure) {
    const value = structure[key];
    const currentPath = base ? `${base}/${key}` : key;
    if (typeof value === 'string') {
      paths.push(value);
    } else {
      paths = paths.concat(getFilePaths(value, currentPath));
    }
  }
  return paths;
}

async function interactiveSelect(filePaths) {
  const selected = new Array(filePaths.length).fill(false);
  let cursorIndex = 0;
  let totalSelectedChars = 0;
  let saveSelection = false;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  async function updateSelectedChars() {
    totalSelectedChars = 0;
    for (let i = 0; i < selected.length; i++) {
      if (selected[i]) {
        const fileContent = await fs.readFile(filePaths[i], 'utf-8');
        totalSelectedChars += fileContent.length;
      }
    }
  }

  function printList() {
    console.clear();
    console.log(chalk.bold('Select files to minify:'));
    filePaths.forEach((filePath, index) => {
      const checkbox = selected[index] ? chalk.green('[x]') : '[ ]';
      const indicator = index === cursorIndex ? chalk.cyan('>') : ' ';
      const coloredFilePath = colorFilePath(filePath, index === cursorIndex);
      console.log(`${indicator} ${checkbox} ${coloredFilePath}`);
    });
    console.log(chalk.bold(`Selected: ${selected.filter(s => s).length} files, ${totalSelectedChars} chars`));
    console.log('');
    const saveCheckbox = saveSelection ? chalk.green('[x]') : '[ ]';
    console.log(`${cursorIndex === filePaths.length ? chalk.cyan('>') : ' '} ${saveCheckbox} Save selection`);
  }

  function colorFilePath(filePath, isCursor) {
    const firstDir = filePath.split('/')[0];
    let color;

    switch (firstDir) {
      case 'src':
        color = chalk.blue;
        break;
      case 'server':
        color = chalk.magenta;
        break;
      case 'supabase':
        color = chalk.yellow;
        break;
      default:
        color = chalk.white;
    }

    return isCursor ? chalk.cyan(filePath) : color(filePath);
  }

  printList();
  cursor.hide();

  return new Promise((resolve) => {
    rl.input.on('keypress', async (str, key) => {
      switch (key.name) {
        case 'up':
          cursorIndex = Math.max(0, cursorIndex - 1);
          break;
        case 'down':
          cursorIndex = Math.min(filePaths.length, cursorIndex + 1);
          break;
        case 'space':
          if (cursorIndex === filePaths.length) {
            saveSelection = !saveSelection;
          } else {
            selected[cursorIndex] = !selected[cursorIndex];
            await updateSelectedChars();
          }
          break;
        case 'return':
          rl.close();
          cursor.show();
          const selectedFiles = filePaths.filter((_, index) => selected[index]);
          if (saveSelection) {
            await saveSelectionToFile(selectedFiles);
          }
          resolve(selectedFiles);
          return;
        case 'c' && key.ctrl:
          rl.close();
          cursor.show();
          process.exit();
          return;
      }
      printList();
    });
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
  });
}

async function saveSelectionToFile(selectedFiles) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  
    const saveName = await new Promise((resolve) => {
      rl.question(chalk.bold('Enter save name: '), (name) => {
        rl.close();
        resolve(name + '.json');
      });
    });
  
    const savePath = path.join(SAVES_DIR, saveName);
    await fs.writeJson(savePath, selectedFiles);
  }

async function readFiles(filePaths) {
  const code = {};
  for (const filePath of filePaths) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    code[filePath] = fileContent;
  }
  return code;
}

minifyCode();