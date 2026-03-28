import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const ImageModal = ({ isOpen, imageUrl, onClose }) => {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 transition-all duration-300 backdrop-blur-sm"
      onClick={onClose}
    >
      <button 
        className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors z-10"
        onClick={onClose}
      >
        <X size={32} />
      </button>

      <div 
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt="Complaint Detail" 
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
        />
      </div>
    </div>
  );
};

export default ImageModal;
