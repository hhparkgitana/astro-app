import React, { useState, useEffect } from 'react';
import { getAllCharts, deleteChart, exportAllCharts, importCharts } from '../../utils/db';
import './ChartLibrary.css';

function ChartLibrary({ isOpen, onClose, onLoadChart }) {
  const [charts, setCharts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCharts();
    }
  }, [isOpen, sortBy, sortOrder]);

  const loadCharts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const allCharts = await getAllCharts({ sortBy, sortOrder });
      setCharts(allCharts);
    } catch (err) {
      setError('Failed to load charts');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id, chartName) => {
    if (!confirm(`Are you sure you want to delete "${chartName}"?`)) {
      return;
    }

    try {
      await deleteChart(id);
      setCharts(charts.filter(chart => chart.id !== id));
    } catch (err) {
      setError('Failed to delete chart');
      console.error(err);
    }
  };

  const handleLoad = (chart) => {
    onLoadChart(chart);
    onClose();
  };

  const handleExport = async () => {
    try {
      const jsonData = await exportAllCharts();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `astro-charts-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export charts');
      console.error(err);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonString = e.target.result;
        const importCount = await importCharts(jsonString);
        alert(`Successfully imported ${importCount} chart(s)`);
        loadCharts(); // Reload the list
      } catch (err) {
        setError(err.message || 'Failed to import charts');
        console.error(err);
      }
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getChartTypeLabel = (chartType) => {
    const labels = {
      'natal': 'Natal',
      'composite': 'Composite',
      'relationship': 'Relationship',
      'solar-return': 'Solar Return',
      'lunar-return': 'Lunar Return'
    };
    return labels[chartType] || chartType;
  };

  const filteredCharts = charts.filter(chart =>
    chart.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (chart.notes && chart.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="library-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="library-header">
          <h2>Chart Library</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="library-toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search charts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="toolbar-actions">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="createdAt">Created Date</option>
              <option value="name">Name</option>
              <option value="chartType">Type</option>
            </select>

            <button
              className="sort-order-btn"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>

            <div className="export-import-buttons">
              <button className="btn-action" onClick={handleExport} title="Export all charts">
                Export
              </button>
              <label className="btn-action" title="Import charts from file">
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-banner">{error}</div>
        )}

        <div className="library-content">
          {isLoading ? (
            <div className="loading-state">Loading charts...</div>
          ) : filteredCharts.length === 0 ? (
            <div className="empty-state">
              {searchTerm ? 'No charts match your search' : 'No saved charts yet'}
            </div>
          ) : (
            <div className="charts-list">
              {filteredCharts.map(chart => (
                <div key={chart.id} className="chart-card">
                  <div className="chart-card-header">
                    <h3>{chart.name}</h3>
                    <span className="chart-type-badge">{getChartTypeLabel(chart.chartType)}</span>
                  </div>

                  {chart.notes && (
                    <p className="chart-notes">{chart.notes}</p>
                  )}

                  <div className="chart-metadata">
                    <span>Created: {formatDate(chart.createdAt)}</span>
                    {chart.formData?.date && (
                      <span>Birth: {chart.formData.date}</span>
                    )}
                  </div>

                  <div className="chart-card-actions">
                    <button
                      className="btn-load"
                      onClick={() => handleLoad(chart)}
                    >
                      Load Chart
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(chart.id, chart.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="library-footer">
          <div className="chart-count">
            {filteredCharts.length} chart{filteredCharts.length !== 1 ? 's' : ''}
            {searchTerm && ` (filtered from ${charts.length})`}
          </div>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default ChartLibrary;
