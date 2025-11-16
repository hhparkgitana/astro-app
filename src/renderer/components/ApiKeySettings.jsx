import React, { useState, useEffect } from 'react';

/**
 * API Key Settings Component
 *
 * Allows users to configure their Anthropic API key for chatbot functionality
 */
function ApiKeySettings() {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Load existing API key on mount
  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    setIsLoading(true);
    try {
      const key = await window.astro.getApiKey();
      if (key) {
        setApiKey(key);
      }
    } catch (error) {
      console.error('Failed to load API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateApiKey = (key) => {
    if (!key || key.trim() === '') {
      return { valid: false, message: 'API key cannot be empty' };
    }

    if (!key.startsWith('sk-ant-')) {
      return { valid: false, message: 'API key must start with "sk-ant-"' };
    }

    if (key.length < 20) {
      return { valid: false, message: 'API key appears to be too short' };
    }

    return { valid: true, message: '' };
  };

  const handleSave = async () => {
    // Validate the API key
    const validation = validateApiKey(apiKey);
    if (!validation.valid) {
      setErrorMessage(validation.message);
      setSaveStatus('error');
      return;
    }

    setSaveStatus('saving');
    setErrorMessage('');

    try {
      await window.astro.setApiKey(apiKey);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Failed to save API key:', error);
      setErrorMessage('Failed to save API key. Please try again.');
      setSaveStatus('error');
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to remove your API key?')) {
      return;
    }

    try {
      await window.astro.setApiKey('');
      setApiKey('');
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Failed to clear API key:', error);
      setErrorMessage('Failed to clear API key. Please try again.');
      setSaveStatus('error');
    }
  };

  if (isLoading) {
    return (
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Anthropic API Key</h4>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>Anthropic API Key</h4>

      <p style={styles.description}>
        Enter your Anthropic API key to enable the chatbot feature. Your API key is stored locally and never shared.
      </p>

      <div style={styles.helpText}>
        <p style={styles.helpParagraph}>
          Don't have an API key? Get one from{' '}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            console.anthropic.com
          </a>
        </p>
      </div>

      <div style={styles.inputGroup}>
        <div style={styles.inputWrapper}>
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setSaveStatus('');
              setErrorMessage('');
            }}
            placeholder="sk-ant-..."
            style={{
              ...styles.input,
              ...(saveStatus === 'error' ? styles.inputError : {})
            }}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            style={styles.toggleButton}
            title={showKey ? "Hide API key" : "Show API key"}
          >
            {showKey ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>

        {errorMessage && (
          <p style={styles.errorText}>{errorMessage}</p>
        )}

        <div style={styles.buttonGroup}>
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            style={{
              ...styles.saveButton,
              ...(saveStatus === 'saving' ? styles.buttonDisabled : {})
            }}
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save API Key'}
          </button>

          {apiKey && (
            <button
              onClick={handleClear}
              disabled={saveStatus === 'saving'}
              style={{
                ...styles.clearButton,
                ...(saveStatus === 'saving' ? styles.buttonDisabled : {})
              }}
            >
              Clear
            </button>
          )}
        </div>

        {saveStatus === 'success' && (
          <p style={styles.successText}>✓ API key saved successfully</p>
        )}
      </div>

      <div style={styles.securityNote}>
        <p style={styles.securityText}>
          🔒 Your API key is encrypted and stored securely on your computer. It will never be transmitted to anyone except Anthropic's API servers.
        </p>
      </div>
    </div>
  );
}

const styles = {
  section: {
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid rgba(218, 165, 32, 0.2)',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#daa520',
    letterSpacing: '0.5px',
  },
  description: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#a0a0a0',
    lineHeight: '1.5',
  },
  helpText: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'rgba(218, 165, 32, 0.05)',
    borderRadius: '6px',
    border: '1px solid rgba(218, 165, 32, 0.15)',
  },
  helpParagraph: {
    margin: 0,
    fontSize: '13px',
    color: '#c0c0c0',
  },
  link: {
    color: '#daa520',
    textDecoration: 'none',
    borderBottom: '1px solid rgba(218, 165, 32, 0.3)',
    transition: 'border-color 0.2s ease',
  },
  loadingText: {
    color: '#a0a0a0',
    fontSize: '14px',
    margin: '8px 0',
  },
  inputGroup: {
    marginTop: '12px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    fontSize: '14px',
    backgroundColor: '#0f0f1e',
    color: '#ffffff',
    border: '1px solid rgba(218, 165, 32, 0.3)',
    borderRadius: '6px',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: 'monospace',
  },
  inputError: {
    borderColor: '#ff4444',
  },
  toggleButton: {
    padding: '8px 12px',
    backgroundColor: 'rgba(218, 165, 32, 0.1)',
    border: '1px solid rgba(218, 165, 32, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s ease',
    minWidth: '44px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  saveButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#daa520',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  clearButton: {
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: '#daa520',
    border: '1px solid rgba(218, 165, 32, 0.5)',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  errorText: {
    margin: '8px 0 0 0',
    fontSize: '13px',
    color: '#ff4444',
  },
  successText: {
    margin: '8px 0 0 0',
    fontSize: '13px',
    color: '#44ff44',
  },
  securityNote: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: 'rgba(218, 165, 32, 0.05)',
    borderRadius: '6px',
    border: '1px solid rgba(218, 165, 32, 0.15)',
  },
  securityText: {
    margin: 0,
    fontSize: '12px',
    color: '#a0a0a0',
    lineHeight: '1.5',
  },
};

export default ApiKeySettings;
