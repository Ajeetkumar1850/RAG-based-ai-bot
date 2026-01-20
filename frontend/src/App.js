import React from 'react';
import ChatInterface from './components/ChatInterface';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            🎓 College AI Assistant
          </h1>
          <p className="text-gray-600">
            Get accurate information about your college from official documents
          </p>
        </header>
        
        <ChatInterface />
        
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Answers are based only on uploaded college documents</p>
          <p className="mt-1">Powered by RAG Architecture</p>
        </footer>
      </div>
    </div>
  );
}

export default App;