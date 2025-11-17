import React from 'react';

/**
 * HoraryAnalysis Component
 *
 * Displays comprehensive horary astrology analysis including:
 * - Radicality checks
 * - Significators
 * - Moon analysis (VOC, next aspect)
 * - Dignities
 */
function HoraryAnalysis({ analysis }) {
  if (!analysis) return null;

  const { radicality, significators, moon, chartType } = analysis;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Horary Analysis</h3>

      {/* Chart Type */}
      <div style={styles.section}>
        <p style={styles.chartType}>{chartType}</p>
      </div>

      {/* Radicality */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Chart Radicality</h4>
        <p style={{
          ...styles.radicalityStatus,
          color: radicality.isRadical ? '#27ae60' : '#e74c3c'
        }}>
          {radicality.summary}
        </p>

        {radicality.warnings && radicality.warnings.length > 0 && (
          <div style={styles.warnings}>
            {radicality.warnings.map((warning, idx) => (
              <div key={idx} style={styles.warningItem}>
                <strong>{warning.type}:</strong> {warning.message}
              </div>
            ))}
          </div>
        )}

        {radicality.issues && radicality.issues.length > 0 && (
          <div style={styles.issues}>
            {radicality.issues.map((issue, idx) => (
              <div key={idx} style={styles.issueItem}>
                <strong>{issue.type}:</strong> {issue.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Significators */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Significators</h4>

        {/* Querent */}
        <div style={styles.significatorBox}>
          <h5 style={styles.significatorTitle}>Querent (You - 1st House)</h5>
          <p style={styles.significatorInfo}>
            <strong>{significators.querent.sign} Rising</strong> - Ruled by <strong>{significators.querent.ruler}</strong>
          </p>
          {significators.querent.dignity && (
            <div style={styles.dignityInfo}>
              <p><strong>Dignity:</strong> {significators.querent.dignity.strength}</p>
              <ul style={styles.dignityList}>
                {significators.querent.dignity.dignities.map((d, idx) => (
                  <li key={idx}>
                    {d.type} ({d.score > 0 ? '+' : ''}{d.score})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Quesited */}
        <div style={styles.significatorBox}>
          <h5 style={styles.significatorTitle}>Quesited (Subject of Question - 7th House)</h5>
          <p style={styles.note}>{significators.quesited.note}</p>
          <p style={styles.significatorInfo}>
            <strong>{significators.quesited.sign}</strong> - Ruled by <strong>{significators.quesited.ruler}</strong>
          </p>
          {significators.quesited.dignity && (
            <div style={styles.dignityInfo}>
              <p><strong>Dignity:</strong> {significators.quesited.dignity.strength}</p>
              <ul style={styles.dignityList}>
                {significators.quesited.dignity.dignities.map((d, idx) => (
                  <li key={idx}>
                    {d.type} ({d.score > 0 ? '+' : ''}{d.score})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Moon Analysis */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Moon Analysis</h4>

        {/* Void of Course */}
        {moon.voidOfCourse && (
          <div style={{
            ...styles.moonBox,
            backgroundColor: moon.voidOfCourse.isVoidOfCourse ? '#ffe6e6' : '#e6f7ff'
          }}>
            <p style={{
              fontWeight: 'bold',
              color: moon.voidOfCourse.isVoidOfCourse ? '#c0392b' : '#2c3e50',
              marginBottom: '0.5rem'
            }}>
              {moon.voidOfCourse.isVoidOfCourse ? '⚠️ Moon is Void of Course' : '✓ Moon is NOT Void of Course'}
            </p>
            <p style={{fontSize: '0.9rem', color: '#555'}}>
              {moon.voidOfCourse.message}
            </p>
            <p style={{fontSize: '0.85rem', color: '#777', marginTop: '0.5rem'}}>
              {moon.voidOfCourse.degreesLeftInSign}° left in {moon.voidOfCourse.currentSign}
            </p>
          </div>
        )}

        {/* Next Aspect */}
        {moon.nextAspect && (
          <div style={styles.moonBox}>
            <p style={{fontWeight: 'bold', marginBottom: '0.5rem'}}>Moon's Next Applying Aspect:</p>
            <p>
              <strong>{moon.nextAspect.aspect}</strong> to <strong>{moon.nextAspect.planet}</strong>
            </p>
            <p style={{fontSize: '0.85rem', color: '#555', marginTop: '0.3rem'}}>
              Current separation: {moon.nextAspect.currentSeparation}° (orb: {moon.nextAspect.orb}°)
            </p>
          </div>
        )}

        {/* Moon Dignity */}
        {moon.dignity && (
          <div style={styles.moonBox}>
            <p><strong>Moon's Essential Dignity:</strong> {moon.dignity.strength}</p>
            <ul style={styles.dignityList}>
              {moon.dignity.dignities.map((d, idx) => (
                <li key={idx}>
                  {d.type} ({d.score > 0 ? '+' : ''}{d.score})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    margin: '2rem 0',
    padding: '1.5rem',
    backgroundColor: '#f0f4f8',
    borderRadius: '8px',
    border: '2px solid #3498db'
  },
  title: {
    margin: '0 0 1.5rem 0',
    color: '#2c3e50',
    fontSize: '1.3rem',
    fontWeight: '600',
    borderBottom: '2px solid #3498db',
    paddingBottom: '0.5rem'
  },
  section: {
    marginBottom: '1.5rem'
  },
  sectionTitle: {
    color: '#2c3e50',
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '0.75rem'
  },
  chartType: {
    fontSize: '0.95rem',
    color: '#555',
    fontStyle: 'italic',
    margin: 0
  },
  radicalityStatus: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '0.75rem'
  },
  warnings: {
    marginTop: '0.5rem'
  },
  warningItem: {
    padding: '0.5rem',
    backgroundColor: '#fff3cd',
    borderLeft: '4px solid #f39c12',
    marginBottom: '0.5rem',
    fontSize: '0.9rem'
  },
  issues: {
    marginTop: '0.5rem'
  },
  issueItem: {
    padding: '0.5rem',
    backgroundColor: '#f8d7da',
    borderLeft: '4px solid #e74c3c',
    marginBottom: '0.5rem',
    fontSize: '0.9rem'
  },
  significatorBox: {
    backgroundColor: 'white',
    padding: '1rem',
    borderRadius: '6px',
    marginBottom: '1rem',
    border: '1px solid #ddd'
  },
  significatorTitle: {
    margin: '0 0 0.5rem 0',
    color: '#3498db',
    fontSize: '1rem'
  },
  significatorInfo: {
    margin: '0.25rem 0',
    fontSize: '0.95rem'
  },
  note: {
    fontSize: '0.85rem',
    color: '#7f8c8d',
    fontStyle: 'italic',
    margin: '0.25rem 0 0.5rem 0'
  },
  dignityInfo: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid #ecf0f1'
  },
  dignityList: {
    margin: '0.5rem 0 0 1rem',
    padding: 0,
    fontSize: '0.9rem'
  },
  moonBox: {
    backgroundColor: 'white',
    padding: '1rem',
    borderRadius: '6px',
    marginBottom: '1rem',
    border: '1px solid #ddd'
  }
};

export default HoraryAnalysis;
