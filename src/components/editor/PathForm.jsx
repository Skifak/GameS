import React, { useState } from 'react';

const PathForm = ({ startPoint, endPoint, nodes, selectedPath, selectedNode, onComplete, onSave, onCancel }) => {
  const isEditMode = !!selectedPath;

  return (
    <div className="point-form" style={{ height: isEditMode ? '350px' : '250px' }}>
      <h3 className="form-title">{isEditMode ? 'Редактирование пути' : 'Создание пути'}</h3>

      {/* Блок свойств пути */}
      <div style={{ marginBottom: '15px' }}>
        <div className="form-label">Начальная точка: {startPoint ? startPoint.name : 'Не выбрана'}</div>
        <div className="form-label">Конечная точка: {endPoint ? endPoint.name : 'Не выбрана'}</div>
        <div className="form-label">Узлы: {nodes.length}</div>
      </div>

      {/* Блок свойств узла (показываем, если выбран узел) */}
      {selectedNode && (
        <div style={{ borderTop: '1px solid var(--outer-space)', paddingTop: '10px' }}>
          <div className="form-label">Выбран узел #{selectedNode.index + 1}</div>
          <div className="form-label">X: {selectedNode.data.x}</div>
          <div className="form-label">Y: {selectedNode.data.y}</div>
          <div className="form-label">Hex Q: {selectedNode.data.hex_q}</div>
          <div className="form-label">Hex R: {selectedNode.data.hex_r}</div>
        </div>
      )}

      {!isEditMode && (
        <div className="form-button-container form-button-create" onClick={onComplete}>
          <span className="form-button-text">Завершить путь</span>
        </div>
      )}
      <div className="form-button-container form-button-save" onClick={onSave}>
        <span className="form-button-text">{isEditMode ? 'Сохранить изменения' : 'Сохранить путь'}</span>
      </div>
      <div className="form-button-container form-button-cancel" onClick={onCancel}>
        <span className="form-button-text">Отмена</span>
      </div>
    </div>
  );
};

export default PathForm;