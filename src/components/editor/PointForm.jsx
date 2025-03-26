import React, { useState } from 'react';

const PointForm = ({ currentHex, onCreate, onCancel }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('camp');
  const typeOptions = ['camp', 'transition', 'anomaly', 'faction'];

  const handleSubmit = () => {
    onCreate({ name, type });
  };

  return (
    <div className="point-form">
      <h3 className="form-title">Новая точка</h3>
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
      <div className="form-button-container form-button-create" onClick={handleSubmit}>
        <span className="form-button-text">Создать</span>
      </div>
      <div className="form-button-container form-button-cancel" onClick={onCancel}>
        <span className="form-button-text">Отмена</span>
      </div>
      <span className="coordinates-text">
        x: {currentHex?.worldX || 0}, y: {currentHex?.worldY || 0}
      </span>
    </div>
  );
};

export default PointForm;