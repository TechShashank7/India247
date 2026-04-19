import React, { useState, useEffect } from 'react';
import { Bot, User } from 'lucide-react'; // Using Lucide React as fallback for Material Symbols

const ChatBubble = ({ isBot, message, children, typing = false }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (typing && message) {
      let i = 0;
      setDisplayedText('');
      const int = setInterval(() => {
        setDisplayedText(message.slice(0, i));
        i++;
        if (i > message.length) {
          clearInterval(int);
        }
      }, 20); // 20ms per character
      return () => clearInterval(int);
    } else {
      setDisplayedText(message || '');
    }
  }, [message, typing]);

  if (isBot) {
    return (
      <div className="flex flex-col gap-1.5 max-w-[85%] self-start mb-6 w-full">
        <div className="flex items-center gap-2 ml-1">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-saffron shadow-sm">
            <Bot size={16} />
          </div>
          <span className="font-heading font-semibold text-xs text-gray-800">Meera</span>
        </div>
        <div className="bg-white text-gray-800 p-4 rounded-2xl rounded-tl-sm shadow-[0_4px_12px_rgba(0,0,0,0.04)] font-sans text-[15px] leading-relaxed border border-gray-100 outline outline-1 outline-gray-50">
          {message && <p>{displayedText}</p>}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 max-w-[85%] self-end mb-6 ml-auto w-full">
      <div className="flex items-center justify-end gap-2 mr-1">
        <span className="font-heading font-semibold text-xs text-gray-500">You</span>
      </div>
      <div className="bg-gradient-to-br from-saffron to-[#d14405] text-white p-4 rounded-2xl rounded-tr-sm shadow-[0_4px_12px_rgba(232,84,26,0.2)] font-sans text-[15px] leading-relaxed">
        {message && <p>{message}</p>}
        {children}
      </div>
    </div>
  );
};

export default ChatBubble;
