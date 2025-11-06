import React, { useState, useMemo } from 'react';
import './FamousChartsBrowser.css';
import { famousChartsData } from '../../shared/data/famousCharts.js';


function FamousChartsBrowser({ isOpen, onClose, onSelectChart }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Get unique categories
  const categories = useMemo(() => {
    if (!famousChartsData.length) return ['All'];
    const cats = ['All', ...new Set(famousChartsData.map(chart => chart.category))];
    return cats.sort();
  }, []);

  // Filter and sort charts based on search and category
  const filteredCharts = useMemo(() => {
    if (!famousChartsData.length) return [];
    const filtered = famousChartsData.filter(chart => {
      const matchesSearch = chart.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           chart.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           chart.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || chart.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort by category first, then by name (create new array to avoid mutation)
    return [...filtered].sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });
  }, [searchTerm, selectedCategory]);

  if (!isOpen) return null;

  const handleSelectChart = (chart) => {
    onSelectChart(chart);
    onClose();
  };

  return (
    <div className="famous-charts-overlay" onClick={onClose}>
      <div className="famous-charts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="famous-charts-header">
          <h2>Famous Charts Database</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="famous-charts-filters">
          <input
            type="text"
            placeholder="Search by name, tags, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="charts-count">
          {`Showing ${filteredCharts.length} of ${famousChartsData.length} charts`}
        </div>

        <div className="famous-charts-grid" key={`${selectedCategory}-${searchTerm}`}>
          {filteredCharts.map(chart => (
            <div
              key={chart.id}
              className="chart-card"
              onClick={() => handleSelectChart(chart)}
            >
              <div className="chart-card-header">
                <h3>{chart.name}</h3>
                <span className={`rodden-rating rating-${chart.roddenRating}`}>
                  {chart.roddenRating}
                </span>
              </div>

              <div className="chart-card-body">
                <p className="chart-category">{chart.category}</p>
                <p className="chart-date">{chart.date} at {chart.time}</p>
                <p className="chart-location">{chart.location}</p>
                {chart.notes && (
                  <p className="chart-notes">{chart.notes.substring(0, 100)}...</p>
                )}
              </div>

              {chart.tags && chart.tags.length > 0 && (
                <div className="chart-tags">
                  {chart.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredCharts.length === 0 && (
          <div className="no-results">
            <p>No charts found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FamousChartsBrowser;
