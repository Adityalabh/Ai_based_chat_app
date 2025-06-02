import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Bot } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useSelector } from 'react-redux';

const AIChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useSelector(store => store.auth);

  // Initialize with a welcome message
  useEffect(() => {
    setMessages([
      {
        id: Date.now(),
        text: `Hello ${user?.username}! I'm your AI assistant. How can I help you today?`,
        isUser: false,
        timestamp: new Date().toISOString()
      }
    ]);
  }, [user?.username]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: inputValue,
      isUser: true,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Send to backend
      const response = await axios.post('/ai/chat', { 
        message: inputValue,
        history: messages.slice(1).map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text
        }))
      });

      // Add AI response
      const aiMessage = {
        id: Date.now() + 1,
        text: response.data.reply,
        isUser: false,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorText = "The AI service is currently unavailable. Please try again later.";
      
      if (error.response) {
        // Handle rate limiting errors
        if (error.response.status === 429) {
          errorText = "You're sending too many requests. Please wait before trying again.";
        }
        // Handle API-specific errors
        else if (error.response.data?.error) {
          errorText = error.response.data.error;
        }
      }
      
      const errorMessage = {
        id: Date.now() + 1,
        text: errorText,
        isUser: false,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen'>
        <div className="flex flex-col h-[calc(100vh-60px)] bg- pl-7 bg-gray-100">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex mb-6 ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!message.isUser && (
                    <Avatar className="mr-3 w-8 h-8">
                      <AvatarImage src="/ai-avatar.jpg" alt="AI" />
                      <AvatarFallback><Bot size={16} /></AvatarFallback>
                    </Avatar>
                  )}
        
                  <div
                    className={`max-w-[70%] rounded-xl px-4 py-2 ${
                      message.isUser
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-100 dark:bg-gray-800 rounded-bl-none text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    <p className="text-xs opacity-70 mt-1 text-right">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
        
                  {message.isUser && (
                    <Avatar className="ml-3 w-8 h-8">
                      <AvatarImage src={user?.profilePicture} alt="User" />
                      <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
        
              {isLoading && (
                <div className="flex mb-6 justify-start">
                  <Avatar className="mr-3 w-8 h-8">
                    <AvatarImage src="/ai-avatar.jpg" alt="AI" />
                    <AvatarFallback><Bot size={16} /></AvatarFallback>
                  </Avatar>
                  <div className="max-w-[70%] bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2 rounded-bl-none">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
        
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
        <div className="p-4 border-t w-full pl-[4rem] py-3 ">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex ">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Message AI assistant..."
            className="flex-1 border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className=" bg-gray-700 hover:bg-black text-white hover:size- px-4 py-2 rounded-r-lg cursor-pointer flex items-center justify-center"
          >
            <Send size={18} className="mr-1" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChatPage;