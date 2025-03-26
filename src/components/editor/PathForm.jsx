import React, { useState } from 'react';

const PathForm = ({ startPoint, endPoint, nodes, onComplete, onSave, onCancel }) => {
  return (
    <div className="point-form">
      <h3 className="form-title">Создание пути</h3>
      <div className="form-label">Начальная точка: {startPoint ? startPoint.name : 'Не выбрана'}</div>
      <div className="form-label">Конечная точка: {endPoint ? endPoint.name : 'Не выбрана'}</div>
      <div className="form-label">Узлы: {nodes.length}</div>
      <div className="form-button-container form-button-create" onClick={onComplete}>
        <span className="form-button-text">Завершить путь</span>
      </div>
      <div className="form-button-container form-button-save" onClick={onSave}>
        <span className="form-button-text">Сохранить путь</span>
      </div>
      <div className="form-button-container form-button-cancel" onClick={onCancel}>
        <span className="form-button-text">Отмена</span>
      </div>
    </div>
  );
};

export default PathForm;