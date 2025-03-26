export function createToolbar(scene) {
    const toolbar = scene.add.container(0, scene.cameras.main.height - 50).setDepth(1000).setScrollFactor(0);
    toolbar.add(scene.add.rectangle(scene.cameras.main.width / 2, 25, scene.cameras.main.width, 50, 0x333333, 0.8).setOrigin(0.5));
    toolbar.hexInfoText = scene.add.text(20, 25, 'Выберите гекс', { fontSize: '18px', color: '#ffffff' }).setOrigin(0, 0.5);
    toolbar.modeText = scene.add.text(250, 25, 'Режим: выбор гекса', { fontSize: '18px', color: '#ffffff' }).setOrigin(0, 0.5);
  
    const buttons = [
      { x: 450, text: 'Добавить точку', action: () => scene.enterAddPointMode() },
      { x: 580, text: 'Добавить путь', action: () => scene.enterAddPathMode() },
      { x: 710, text: 'Сохранить', action: () => scene.saveMap() },
    ];
  
    buttons.forEach(btn => {
      const container = scene.add.container(btn.x, 25);
      const bg = scene.add.rectangle(0, 0, btn.text.length * 12, 35, 0x444444).setStrokeStyle(1, 0xffffff);
      const text = scene.add.text(0, 0, btn.text, { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
      container.add([bg, text]);
      container.setInteractive(new Phaser.Geom.Rectangle(-bg.width / 2, -17.5, bg.width, 35), Phaser.Geom.Rectangle.Contains);
      container.on('pointerdown', btn.action);
      toolbar.add(container);
    });
  
    return toolbar;
  }
  
  export function createPointForm(scene) {
    const form = scene.add.container(scene.cameras.main.width - 250, 150).setDepth(1000).setScrollFactor(0).setVisible(false);
    form.add(scene.add.rectangle(0, 0, 220, 250, 0x333333, 0.9).setStrokeStyle(1, 0xffffff));
    form.add(scene.add.text(0, -100, 'Новая точка', { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5));
    form.add(scene.add.text(-90, -60, 'Название:', { fontSize: '14px', color: '#ffffff' }).setOrigin(0, 0.5));
  
    const nameBg = scene.add.rectangle(0, -30, 180, 30, 0x555555).setStrokeStyle(1, 0xffffff).setInteractive();
    form.nameInput = scene.add.dom(0, -30, 'input', { type: 'text', style: 'width: 160px; padding: 5px;' });
    form.add([nameBg, form.nameInput]);
    nameBg.on('pointerdown', () => form.nameInput.node.focus());
  
    form.add(scene.add.text(-90, 10, 'Тип точки:', { fontSize: '14px', color: '#ffffff' }).setOrigin(0, 0.5));
    form.typeOptions = ['camp', 'transition', 'anomaly', 'faction'];
    form.currentTypeIndex = 0;
    const typeBg = scene.add.rectangle(0, 40, 180, 30, 0x555555).setStrokeStyle(1, 0xffffff).setInteractive();
    form.typeText = scene.add.text(0, 40, form.typeOptions[0], { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
    form.add([typeBg, form.typeText]);
  
    const prevBtn = scene.add.triangle(-80, 40, 0, 0, 8, 8, 0, 16, 0x999999).setInteractive();
    const nextBtn = scene.add.triangle(80, 40, 0, 8, 8, 0, 8, 16, 0x999999).setInteractive();
    prevBtn.on('pointerdown', () => {
      form.currentTypeIndex = (form.currentTypeIndex - 1 + form.typeOptions.length) % form.typeOptions.length;
      form.typeText.setText(form.typeOptions[form.currentTypeIndex]);
    });
    nextBtn.on('pointerdown', () => {
      form.currentTypeIndex = (form.currentTypeIndex + 1) % form.typeOptions.length;
      form.typeText.setText(form.typeOptions[form.currentTypeIndex]);
    });
    form.add([prevBtn, nextBtn]);
  
    const createBtn = scene.add.container(0, 90);
    createBtn.add([scene.add.rectangle(0, 0, 120, 30, 0x00aa00).setStrokeStyle(1, 0xffffff),
      scene.add.text(0, 0, 'Создать', { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5)]);
    createBtn.setInteractive(new Phaser.Geom.Rectangle(-60, -15, 120, 30), Phaser.Geom.Rectangle.Contains);
    createBtn.on('pointerdown', () => scene.createPointFromForm());
  
    const cancelBtn = scene.add.container(0, 130);
    cancelBtn.add([scene.add.rectangle(0, 0, 120, 30, 0xaa0000).setStrokeStyle(1, 0xffffff),
      scene.add.text(0, 0, 'Отмена', { fontSize: '14px', color: '#ffffff' }).setOrigin(0.5)]);
    cancelBtn.setInteractive(new Phaser.Geom.Rectangle(-60, -15, 120, 30), Phaser.Geom.Rectangle.Contains);
    cancelBtn.on('pointerdown', () => scene.resetMode());
  
    form.coordinatesText = scene.add.text(0, -60, 'x: 0, y: 0', { fontSize: '16px', color: '#ffffff', backgroundColor: '#333333', padding: { x: 5, y: 3 } });
    form.add([createBtn, cancelBtn, form.coordinatesText]);
  
    return form;
  }