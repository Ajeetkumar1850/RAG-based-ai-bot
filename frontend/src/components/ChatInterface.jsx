import React, { useState } from 'react';
import { Send, Paperclip, Loader2, X } from 'lucide-react';
import { askQuestion, uploadDocument } from '../services/api';
import MessageBubble from './MessageBubble';

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your College AI Assistant. Upload a document and ask me about admissions, fees, placements, or facilities.",
      timestamp: new Date().toISOString(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputText,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    const question = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      const response = await askQuestion(question, 'default');
      
      const aiMessage = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
        confidence: response.confidence,
        sources: response.sources,
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadDocument(file, 'default', (progress) => {
        setUploadProgress(progress);
      });

      const successMessage = {
        role: 'assistant',
        content: `✅ Document uploaded! ${result.chunksCreated} chunks created. You can now ask questions.`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, successMessage]);
      setShowUpload(false);
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: `❌ Upload failed: ${err.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-800 text-white p-4">
        <h2 className="text-xl font-semibold">College RAG Chatbot</h2>
        <p className="text-blue-200 text-sm">Answers from your documents only</p>
      </div>

      {/* Messages */}
      <div className="h-[500px] overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <MessageBubble key={index} message={msg} />
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-none p-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Upload Document (PDF, TXT, DOCX)</h3>
            <button onClick={() => setShowUpload(false)}>
              <X size={20} />
            </button>
          </div>
          <input
            type="file"
            accept=".pdf,.txt,.docx"
            onChange={handleFileSelect}
            disabled={uploading}
            className="block w-full text-sm"
          />
          {uploading && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">{uploadProgress}%</p>
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="p-3 rounded-lg border hover:bg-gray-50"
          >
            <Paperclip size={20} />
          </button>
          
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about admission, fees, placements..."
            className="flex-1 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="2"
            disabled={isLoading}
          />
          
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUploadSuccess = (result) => {
    const successMessage = {
      role: 'assistant',
      content: `Document uploaded successfully! ${result.chunksCreated} chunks created and ready for questions.`,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, successMessage]);
    setShowUpload(false);
  };

  const sampleQuestions = [
    "What is the admission process?",
    "Tell me about placement statistics",
    "What are the hostel facilities?",
    "What are the fees for CSE?",
  ];

  const handleSampleClick = (question) => {
    setInputText(question);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Chat Header */}
      <div className="bg-blue-800 text-white p-4">
        <h2 className="text-xl font-semibold">Chat with College AI</h2>
        <p className="text-blue-200 text-sm">Based on official college documents</p>
      </div>

      {/* Messages Container */}
      <div className="h-[500px] overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <MessageBubble key={index} message={msg} />
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-none p-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Sample questions */}
        {messages.length === 1 && !isLoading && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 font-semibold">Try asking:</p>
            <div className="grid grid-cols-1 gap-2">
              {sampleQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSampleClick(q)}
                  className="text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-900 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* File Upload Section */}
      {showUpload && (
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">Upload Document</h3>
            <button
              onClick={() => setShowUpload(false)}
              className="text-gray-600 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>
          <FileUpload
            collegeId={collegeId}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="p-3 rounded-lg border hover:bg-gray-50"
            title="Upload document"
          >
            <Paperclip size={20} />
          </button>
          
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about admission, fees, facilities, placements..."
            className="flex-1 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="2"
            disabled={isLoading}
          />
          
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          <p>💡 Upload college documents (PDF, TXT, DOCX) to get started</p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;