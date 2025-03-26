import React, { useState, useEffect } from 'react';

const EditPointForm = ({ point, onSave, onDelete, onCancel }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('camp');
  const typeOptions = ['camp', 'transition', 'anomaly', 'faction'];

  useEffect(() => {
    if (point) {
      setName(point.name);
      setType(point.type);
    }
  }, [point]);

  const handleSubmit = () => {
    onSave({ name, type });
  };

  return (
    <div className="edit-point-form">
      <h3 className="form-title">Редактировать точку</h3>
      <label className="form-label">Название:</label>
      <div className="form-input-bg">
        <input
          className="form-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <label className="form-label">Тип точки:</label>
      <div className="type-selector-bg">
        <select
          className="type-text"
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ width: '100%', background: 'transparent', border: 'none', color: 'inherit' }}
        >
          {typeOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div className="form-button-container form-button-save" onClick={handleSubmit}>
        <span className="form-button-text">Сохранить</span>
      </div>
      <div className="form-button-container form-button-delete" onClick={onDelete}>
        <span className="form-button-text">Удалить</span>
      </div>
      <div className="form-button-container form-button-cancel" onClick={onCancel}>
        <span className="form-button-text">Отмена</span>
      </div>
      <span className="coordinates-text">x: {point.x}, y: {point.y}</span>
    </div>
  );
};

export default EditPointForm;