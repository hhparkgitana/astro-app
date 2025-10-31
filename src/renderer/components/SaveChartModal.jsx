import React, { useState } from 'react';
import './SaveChartModal.css';

function SaveChartModal({ isOpen, onClose, onSave, initialName = '', existingChart = null }) {
  const [chartName, setChartName] = useState(initialName);
  const [notes, setNotes] = useState(existingChart?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!chartName.trim()) {
      setError('Chart name is required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onSave({
        name: chartName.trim(),
        notes: notes.trim()
      });

      // Reset form
      setChartName('');
      setNotes('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save chart');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setChartName(initialName);
    setNotes(existingChart?.notes || '');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{existingChart ? 'Update Chart' : 'Save Chart'}</h3>
          <button className="modal-close" onClick={handleCancel}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="chart-name">
              Chart Name <span className="required">*</span>
            </label>
            <input
              id="chart-name"
              type="text"
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              placeholder="Enter a name for this chart"
              autoFocus
              disabled={isSaving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="chart-notes">Notes (optional)</label>
            <textarea
              id="chart-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this chart"
              rows="4"
              disabled={isSaving}
            />
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : (existingChart ? 'Update' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SaveChartModal;
