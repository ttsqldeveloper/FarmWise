import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Send, Bot, User, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const response = await axios.get('/api/chatbot/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const history = response.data.history.map(msg => ({
        text: msg.question,
        answer: msg.answer,
        isUser: true,
        timestamp: new Date(msg.created_at)
      }));
      setMessages(history);
    } catch (error) {
      console.error('Failed to load history');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, isUser: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post('/api/chatbot/ask', 
        { question: input },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const botMessage = {
        text: response.data.answer,
        isUser: false,
        timestamp: new Date(),
        actionItems: response.data.actionItems
      };
      setMessages(prev => [...prev, botMessage]);

      if (response.data.actionItems) {
        toast.success('New action items added to your reminders!');
      }
    } catch (error) {
      toast.error('Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-green-600 p-4">
          <h2 className="text-white text-xl font-bold flex items-center">
            <Bot className="mr-2" size={24} />
            FarmWise AI Assistant
          </h2>
          <p className="text-green-100 text-sm">Ask me anything about farming!</p>
        </div>

        <div className="h-96 overflow-y-auto p-4 bg-gray-50">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-32">
              <Bot size={48} className="mx-auto mb-3 text-gray-400" />
              <p>Hello! I'm your farming assistant. Ask me about:</p>
              <p className="text-sm mt-2">• Crop diseases • Vaccination schedules • Feeding • Seasonal prep</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex mb-4 ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3/4 ${msg.isUser ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800'} rounded-lg p-3`}>
                {!msg.isUser && <Bot size={16} className="inline mr-1 mb-1" />}
                <div className="whitespace-pre-wrap text-sm">{msg.text}</div>
                <div className="text-xs mt-1 opacity-75">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-200 rounded-lg p-3">
                <Loader className="animate-spin" size={16} />
                <span className="text-sm ml-2">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about farming..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;