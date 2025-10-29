import React, { useState, useRef, useEffect } from 'react';
import './ChatPanel.css';

function ChatPanel({ chartData, chartDataB, viewMode, formData, formDataB, isOpen, onToggle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const buildChartContext = () => {
    const context = {
      mode: viewMode,
      charts: []
    };

    // Add Chart A if available
    if (chartData && chartData.success) {
      context.charts.push({
        label: 'Chart A',
        name: formData.name || 'Unnamed',
        birthDate: `${formData.month}/${formData.day}/${formData.year}`,
        birthTime: `${formData.hour}:${formData.minute}`,
        location: formData.location,
        timezone: formData.timezone,
        ascendant: chartData.ascendant,
        midheaven: chartData.midheaven,
        planets: chartData.planets,
        houses: chartData.houses,
        aspects: chartData.aspects,
        hasTransits: !!chartData.transits,
        transits: chartData.transits ? {
          date: `${formData.transitMonth}/${formData.transitDay}/${formData.transitYear}`,
          time: `${formData.transitHour}:${formData.transitMinute}`,
          planets: chartData.transits.planets,
          transitAspects: chartData.transitAspects
        } : null
      });
    }

    // Add Chart B if in dual mode and available
    if (viewMode === 'dual' && chartDataB && chartDataB.success) {
      context.charts.push({
        label: 'Chart B',
        name: formDataB.name || 'Unnamed',
        birthDate: `${formDataB.month}/${formDataB.day}/${formDataB.year}`,
        birthTime: `${formDataB.hour}:${formDataB.minute}`,
        location: formDataB.location,
        timezone: formDataB.timezone,
        ascendant: chartDataB.ascendant,
        midheaven: chartDataB.midheaven,
        planets: chartDataB.planets,
        houses: chartDataB.houses,
        aspects: chartDataB.aspects,
        hasTransits: !!chartDataB.transits,
        transits: chartDataB.transits ? {
          date: `${formDataB.transitMonth}/${formDataB.transitDay}/${formDataB.transitYear}`,
          time: `${formDataB.transitHour}:${formDataB.transitMinute}`,
          planets: chartDataB.transits.planets,
          transitAspects: chartDataB.transitAspects
        } : null
      });
    }

    return context;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message to chat
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      // Build chart context
      const chartContext = buildChartContext();

      // Call API via IPC
      const response = await window.astro.chatWithClaude({
        message: userMessage,
        chartContext: chartContext,
        conversationHistory: messages
      });

      if (response.success) {
        setMessages([...newMessages, { role: 'assistant', content: response.message }]);
      } else {
        setMessages([...newMessages, {
          role: 'assistant',
          content: `Error: ${response.error || 'Failed to get response from Claude'}`
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, {
        role: 'assistant',
        content: `Error: ${error.message}`
      }]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className={`chat-panel ${isOpen ? 'open' : 'closed'}`}>
      <div className="chat-header">
        <h3>🤖 Astrology AI Assistant</h3>
        <div className="chat-header-actions">
          {messages.length > 0 && (
            <button onClick={clearChat} className="clear-btn" title="Clear conversation">
              🗑️
            </button>
          )}
          <button onClick={onToggle} className="toggle-btn">
            {isOpen ? '→' : '←'}
          </button>
        </div>
      </div>

      {isOpen && (
        <>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <p>👋 Welcome! I'm your AI astrology assistant.</p>
                <p>Ask me anything about the chart(s) you're viewing:</p>
                <ul>
                  <li>"Interpret this chart for me"</li>
                  <li>"What does Neptune in the 5th house mean?"</li>
                  <li>"What's the most significant aspect?"</li>
                  <li>"Tell me about the Sabian symbol for my Sun"</li>
                  {viewMode === 'dual' && <li>"How compatible are these two charts?"</li>}
                </ul>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-content">
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="message assistant">
                <div className="message-content loading">
                  <span className="loading-dots">●</span>
                  <span className="loading-dots">●</span>
                  <span className="loading-dots">●</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about the chart..."
              disabled={loading}
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="send-btn"
            >
              {loading ? '⏳' : '→'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatPanel;
