/**
 * Рендерит точки интереса в сцене Phaser.
 * @module Point
 */

export class Point {
  constructor(scene, data = {}) {
    this.scene = scene;
    this.id = data.id || Date.now();
    this.name = data.name || 'Новая точка';
    this.type = data.type || 'camp';
    this.hex_q = data.hex_q || 0;
    this.hex_r = data.hex_r || 0;
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.graphic = null;
    
    // Создаем графическое представление точки
    this.createGraphic();
  }
  
  /**
   * Создает графическое представление точки
   */
  createGraphic() {
    // Если графика уже существует, удаляем ее
    if (this.graphic) {
      this.graphic.destroy();
    }
    
    // Создаем новый графический объект
    const pointGraphic = this.scene.add.graphics()
      .setDepth(100)
      .setInteractive(new Phaser.Geom.Circle(0, 0, 20), Phaser.Geom.Circle.Contains);
    
    // Определяем цвет в зависимости от типа
    let fillColor;
    switch (this.type) {
      case 'camp':
        fillColor = 0x2ecc71; // Зеленый
        break;
      case 'transition':
        fillColor = 0xe74c3c; // Красный
        break;
      case 'anomaly':
        fillColor = 0xf39c12; // Оранжевый
        break;
      case 'faction':
        fillColor = 0x3498db; // Синий
        break;
      default:
        fillColor = 0x95a5a6; // Серый
    }
    
    // Рисуем точку
    pointGraphic.fillStyle(fillColor, 1);
    pointGraphic.fillCircle(this.x, this.y, 15);
    pointGraphic.lineStyle(2, 0xffffff, 0.8);
    pointGraphic.strokeCircle(this.x, this.y, 15);
    
    // Добавляем текст с названием точки
    const pointText = this.scene.add.text(this.x, this.y + 25, this.name, {
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5).setDepth(101);
    
    // Объединяем графику и текст в контейнер
    const container = this.scene.add.container(0, 0, [pointGraphic, pointText]);
    container.setDepth(100);
    container.pointData = {
      id: this.id,
      name: this.name,
      type: this.type,
      hex_q: this.hex_q,
      hex_r: this.hex_r,
      x: this.x,
      y: this.y
    };
    
    // Добавляем события
    container.setInteractive(new Phaser.Geom.Circle(this.x, this.y, 20), Phaser.Geom.Circle.Contains);
    container.on('pointerdown', () => {
      console.log(`Point clicked: id=${this.id}, type=${this.type}`);
      this.scene.game.events.emit('point-clicked', this);
    });
    
    this.graphic = container;
    return container;
  }
  
  /**
   * Обновляет данные точки
   * @param {Object} data - Новые данные
   */
  update(data) {
    // Обновляем данные
    Object.assign(this, data);
    
    // Пересоздаем графику с новыми данными
    this.createGraphic();
  }
  
  /**
   * Уничтожает графическое представление точки
   */
  destroy() {
    if (this.graphic) {
      this.graphic.destroy();
      this.graphic = null;
    }
  }
  
  /**
   * Создает визуальный предпросмотр точки
   * @param {Phaser.Scene} scene - Сцена, в которой создается предпросмотр
   * @param {number} x - Координата x
   * @param {number} y - Координата y
   * @returns {Phaser.GameObjects.Graphics} - Графический объект превью
   */
  static createPreview(scene, x, y) {
    const previewGraphic = scene.add.graphics();
    previewGraphic.fillStyle(0x3498db, 0.6);
    previewGraphic.fillCircle(x, y, 15);
    previewGraphic.lineStyle(2, 0xffffff, 0.8);
    previewGraphic.strokeCircle(x, y, 15);
    return previewGraphic;
  }
}