/**
 * SVG to Image Export Utilities
 * Converts SVG elements to PNG or JPG for chart exports
 */

/**
 * Convert SVG element to PNG or JPG data URL
 * @param {SVGElement} svgElement - The SVG element to convert
 * @param {string} format - 'png' or 'jpeg'
 * @param {number} scale - Resolution multiplier (2 = 2x resolution)
 * @returns {Promise<string>} Data URL of the image
 */
export async function svgToImage(svgElement, format = 'png', scale = 2) {
  return new Promise((resolve, reject) => {
    try {
      // Clone the SVG to avoid modifying the original
      const svgClone = svgElement.cloneNode(true);

      // Get SVG dimensions
      const bbox = svgElement.getBoundingClientRect();
      const width = bbox.width * scale;
      const height = bbox.height * scale;

      // Set explicit dimensions on clone
      svgClone.setAttribute('width', width);
      svgClone.setAttribute('height', height);

      // Convert SVG to string
      const svgString = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Create image from SVG
      const img = new Image();
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // White background for JPG (JPG doesn't support transparency)
        if (format === 'jpeg') {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
        }

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to data URL
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const quality = format === 'jpeg' ? 0.95 : undefined;
        const dataUrl = canvas.toDataURL(mimeType, quality);

        // Clean up
        URL.revokeObjectURL(svgUrl);
        resolve(dataUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error('Failed to load SVG image'));
      };

      img.src = svgUrl;
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Export SVG element as image file
 * @param {SVGElement} svgElement - The SVG to export
 * @param {string} filename - Default filename
 * @param {string} format - 'png' or 'jpeg'
 * @param {number} scale - Resolution multiplier
 * @returns {Promise<Object>} Result object with success status and path
 */
export async function exportSVGAsImage(svgElement, filename, format = 'png', scale = 2) {
  try {
    const dataUrl = await svgToImage(svgElement, format, scale);

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Convert blob to array buffer for Electron
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Call Electron IPC to save file
    const result = await window.astro.exportChartImage({
      imageBuffer: Array.from(uint8Array), // Convert to regular array for IPC
      filename: filename,
      format: format
    });

    return result;
  } catch (error) {
    console.error('Export image error:', error);
    throw error;
  }
}

/**
 * Generate smart filename for chart export
 * @param {Object} formData - Chart form data
 * @param {string} format - File format extension
 * @returns {string} Generated filename
 */
export function generateChartFilename(formData, format) {
  const name = formData?.name || 'Chart';
  const safeName = name.replace(/[^a-zA-Z0-9]/g, '_');

  if (formData?.year && formData?.month && formData?.day) {
    const year = formData.year;
    const month = formData.month.toString().padStart(2, '0');
    const day = formData.day.toString().padStart(2, '0');
    return `${safeName}_${year}${month}${day}_wheel.${format}`;
  }

  return `${safeName}_wheel.${format}`;
}
