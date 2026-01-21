import React from 'react';
import { Bot, User } from 'lucide-react';

/**
 * MessageBubble component displays a chat message with role-based styling
 * @param {Object} props
 * @param {Object} props.message - The message object
 * @param {string} props.message.role - 'user' or 'assistant'
 * @param {string} props.message.content - The message text
 * @param {string} props.message.timestamp - ISO timestamp
 * @param {number} [props.message.confidence] - Confidence score (0-1) for AI messages
 * @param {Array} [props.message.sources] - Source documents for AI messages
 */
const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format confidence as percentage
  const formatConfidence = (confidence) => {
    if (confidence === undefined || confidence === null) return null;
    return `${Math.round(confidence * 100)}%`;
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl p-4 ${
        isUser 
          ? 'bg-blue-600 text-white rounded-br-none' 
          : 'bg-gray-100 text-gray-900 rounded-bl-none'
      }`}>
        {/* Message content */}
        <p className="whitespace-pre-wrap">{message.content}</p>

        {/* Confidence score for AI messages */}
        {isAssistant && message.confidence !== undefined && message.confidence !== null && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <span className="text-xs text-gray-600">
              Confidence: {formatConfidence(message.confidence)}
            </span>
          </div>
        )}

        {/* Source documents for AI messages */}
        {isAssistant && message.sources && message.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <p className="text-xs text-gray-600 font-semibold mb-1">Sources:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              {message.sources.map((source, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1">•</span>
                  <span>
                    {source.filename}
                    {source.similarity !== undefined && (
                      <span className="ml-1 text-gray-500">
                        ({Math.round(source.similarity * 100)}% match)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timestamp and role indicator */}
        <span className={`text-xs mt-1 block ${
          isUser ? 'opacity-70' : 'opacity-70'
        }`}>
          {formatTime(message.timestamp)}
          {' • '}
          {isUser ? (
            <span className="inline-flex items-center">
              <User size={12} className="inline mr-1" />
              You
            </span>
          ) : (
            <span className="inline-flex items-center">
              <Bot size={12} className="inline mr-1" />
              AI Assistant
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
