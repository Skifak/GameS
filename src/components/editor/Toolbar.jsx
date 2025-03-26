import React from 'react';

const Toolbar = ({ currentHex, editMode, onAddPoint, onAddPath, onSave }) => {
  return (
    <div className="toolbar">
      <span className="hex-info-text">
        {currentHex ? `Гекс: q=${currentHex.q}, r=${currentHex.r}` : 'Выберите гекс'}
      </span>
      <span className="mode-text">
        Режим: {editMode === 'select' ? 'выбор гекса' : editMode === 'addPoint' ? 'добавление точки' : editMode === 'addPath' ? 'добавление пути' : 'редактирование точки'}
      </span>
      <div className="button-container" onClick={onAddPoint}>
        <span className="button-text">Добавить точку</span>
      </div>
      <div className="button-container" onClick={onAddPath}>
        <span className="button-text">Добавить путь</span>
      </div>
      <div className="button-container" onClick={onSave}>
        <span className="button-text">Сохранить</span>
      </div>
    </div>
  );
};

export default Toolbar;