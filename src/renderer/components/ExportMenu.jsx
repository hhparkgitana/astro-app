import React, { useState, useRef, useEffect } from 'react';
import { exportSVGAsImage, generateChartFilename } from '../utils/svgExport.js';
import './ExportMenu.css';

/**
 * Export menu dropdown for chart exports
 * Provides PNG and JPG export options
 */
function ExportMenu({ svgRef, formData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState(null);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleExport = async (format) => {
    if (!svgRef?.current) {
      setMessage({ type: 'error', text: 'Chart not available for export' });
      return;
    }

    setIsExporting(true);
    setMessage(null);

    try {
      const filename = generateChartFilename(formData, format);
      const result = await exportSVGAsImage(svgRef.current, filename, format, 2);

      if (result.success) {
        setMessage({ type: 'success', text: `Exported to ${result.path}` });
        setTimeout(() => {
          setMessage(null);
          setIsOpen(false);
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Export failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-menu" ref={menuRef}>
      <button
        className="export-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
      >
        {isExporting ? 'Exporting...' : 'Export Chart'}
      </button>

      {isOpen && !isExporting && (
        <div className="export-menu-dropdown">
          <button
            className="export-option"
            onClick={() => handleExport('png')}
          >
            Export as PNG
          </button>
          <button
            className="export-option"
            onClick={() => handleExport('jpeg')}
          >
            Export as JPG
          </button>
        </div>
      )}

      {message && (
        <div className={`export-message export-message-${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default ExportMenu;
