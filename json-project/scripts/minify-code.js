import fs from 'fs-extra';
import path from 'path';
import pkg from 'enquirer';
const { Select, Confirm, Input, prompt } = pkg;
import chalk from 'chalk';
import cursor from 'cli-cursor';

const SAVES_DIR = path.join('json-project', 'minify-saves');
const JSON_DIR = 'json-project';

async function minifyCode() {
  await fs.ensureDir(JSON_DIR);
  await fs.ensureDir(SAVES_DIR);
  const saveFiles = await fs.readdir(SAVES_DIR);

  const firstAction = await prompt({
    type: 'select',
    name: 'action',
    message: chalk.bold('What do you want to do?'),
    choices: [
      { name: 'minify', message: 'Select files to minify' },
      { name: 'load', message: 'Load a saved selection' },
      { name: 'manage', message: 'Manage saved selections' },
      { name: 'exit', message: 'Exit' },
    ],
  });

  switch (firstAction.action) {
    case 'minify':
      const structure = await fs.readJson(path.join(JSON_DIR, 'project-structure.min.json'));
      const filePaths = getFilePaths(structure);
      const selectedFiles = await interactiveSelect(filePaths);
      if (selectedFiles && selectedFiles.length > 0) {
        await minifyAndSave(selectedFiles);
      } else {
        console.log(chalk.yellow('No files selected for minification.'));
      }
      break;
    case 'load':
      if (saveFiles.length > 0) {
        await loadSave(saveFiles);
      } else {
        console.log(chalk.yellow('No saved selections found.'));
      }
      break;
    case 'manage':
      if (saveFiles.length > 0) {
        await manageSaves(saveFiles);
      } else {
        console.log(chalk.yellow('No saved selections found to manage.'));
      }
      break;
    case 'exit':
      console.log(chalk.gray('Exiting.'));
      break;
  }
}

async function minifyAndSave(selectedFiles) {
  const code = await readFiles(selectedFiles);
  const codeJSON = JSON.stringify(code);
  const minifiedCodeJSON = codeJSON.replace(/\s+/g, ' ');
  await fs.writeFile(path.join(JSON_DIR, 'project-code.min.json'), minifiedCodeJSON);
  console.log(chalk.green('project-code.min.json created successfully!'));
}

async function loadSave(saveFiles) {
  const loadSavePrompt = new Select({
    name: 'selectedSave',
    message: chalk.bold('Select save to load:'),
    choices: [...saveFiles, chalk.bold('Back to main menu')],
  });

  const selectedSave = await loadSavePrompt.run();

  if (!selectedSave || selectedSave === chalk.bold('Back to main menu')) {
    return;
  }

  const savePath = path.join(SAVES_DIR, selectedSave);
  const selectedFiles = await fs.readJson(savePath);
  await minifyAndSave(selectedFiles);
}

async function manageSaves(saveFiles) {
  const managePrompt = new Select({
    name: 'saveAction',
    message: chalk.bold('Manage saved selections:'),
    choices: [
      ...saveFiles,
      { name: 'delete', message: chalk.red('Delete a save') },
      { name: 'back', message: 'Back to main menu' },
    ],
  });

  const selectedAction = await managePrompt.run();

  if (selectedAction === 'delete') {
    await deleteSave(saveFiles);
  } else if (selectedAction !== 'back') {
    console.log(chalk.yellow(`Selected save: ${selectedAction}`));
    // You could potentially add options to view the contents of a save here
  }
}

async function deleteSave(saveFiles) {
  const deletePrompt = new Select({
    name: 'saveToDelete',
    message: chalk.bold(chalk.red('Select a save to delete:')),
    choices: [...saveFiles, chalk.bold('Cancel')],
  });

  const saveToDelete = await deletePrompt.run();

  if (saveToDelete && saveToDelete !== chalk.bold('Cancel')) {
    const confirmDelete = await prompt({
      type: 'confirm',
      name: 'confirm',
      message: chalk.bold(chalk.red(`Are you sure you want to delete ${saveToDelete}?`)),
      initial: false,
    });

    if (confirmDelete.confirm) {
      const savePath = path.join(SAVES_DIR, saveToDelete);
      await fs.remove(savePath);
      console.log(chalk.green(`Deleted save: ${saveToDelete}`));
      const updatedSaveFiles = await fs.readdir(SAVES_DIR);
      if (updatedSaveFiles.length > 0) {
        await manageSaves(updatedSaveFiles);
      } else {
        console.log(chalk.yellow('No saved selections left.'));
      }
    } else {
      console.log(chalk.gray('Delete cancelled.'));
      await manageSaves(saveFiles);
    }
  } else if (saveToDelete !== chalk.bold('Cancel')) {
    await manageSaves(saveFiles);
  }
}

async function interactiveSelect(filePaths) {
  const choices = filePaths.map((filePath) => {
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

    return {
      name: filePath,
      message: color(filePath),
    };
  });

  const selectPrompt = new Select({
    name: 'selectedFiles',
    message: chalk.bold('Select files to minify:'),
    choices: choices,
    multiple: true,
    async indicator(state, choice) {
      const checkbox = choice.enabled ? chalk.green('[x]') : '[ ]';
      return checkbox;
    },
    async result() {
      return this.selected.map((choice) => choice.name);
    },
  });

  const selectedFiles = await selectPrompt.run();

  if (selectedFiles && selectedFiles.length > 0) {
    const confirmSave = new Confirm({
      name: 'saveSelection',
      message: chalk.bold('Do you want to save this selection?'),
      initial: false,
    });

    const shouldSave = await confirmSave.run();

    if (shouldSave) {
      await saveSelectionToFile(selectedFiles);
    }
  }

  return selectedFiles;
}

async function saveSelectionToFile(selectedFiles) {
  const saveNamePrompt = new Input({
    name: 'saveName',
    message: chalk.bold('Enter save name:'),
    validate: (value) => value.length > 0,
  });

  const saveName = await saveNamePrompt.run();
  const savePath = path.join(SAVES_DIR, `${saveName}.json`);
  await fs.writeJson(savePath, selectedFiles);
  console.log(chalk.green(`Selection saved to ${savePath}`));
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

async function readFiles(filePaths) {
  const code = {};
  for (const filePath of filePaths) {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      code[filePath] = fileContent;
    } catch (error) {
      console.error(chalk.red(`Error reading file: ${filePath}`), error);
    }
  }
  return code;
}

function colorFilePath(filePath) {
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

  return color(filePath);
}

minifyCode();