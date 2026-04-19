import React from 'react';
import { MapPin, MessageSquare, Share2, ThumbsUp } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ComplaintCard = ({ complaint, onImageClick, onUpvote, onComment, onShare, showComments, toggleComments }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [commentText, setCommentText] = React.useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const formatTime = (date) => {
    if (!date) return 'Just now';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCommentTime = (dateStr) => {
    if (!dateStr) return 'Just now';
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return timeStr;
    }
    return d.toLocaleDateString() + ' ' + timeStr;
  };

  const isOwner = user?.uid && complaint.user?.uid === user.uid;
  // If the currently logged in user is the one who submitted it, show their real name, otherwise show what's in DB (which might be 'Anonymous')
  const authorName = isOwner ? (user?.name || complaint.user?.name) : (complaint.user?.name || 'Citizen');
  const avatarLetter = authorName && authorName !== 'Anonymous' ? authorName[0] : (complaint.title ? complaint.title[0] : 'C');

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.99] sm:hover:-translate-y-1 cursor-pointer w-full">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-sm sm:text-base">
            {complaint.user?.avatar || avatarLetter}
          </div>
          <div>
            <p className="font-semibold text-sm sm:text-base text-gray-800">{authorName}</p>
            <p className="text-xs text-gray-400">{formatTime(complaint.createdAt)}</p>
          </div>
        </div>
        <div className="bg-gray-100 px-3 py-1.5 rounded-full text-xs font-bold text-gray-600">
          {complaint.category}
        </div>
      </div>
      
      <h3 className="font-semibold text-base sm:text-lg mb-2 text-gray-900 leading-tight">{complaint.title}</h3>
      <div className="mb-4 text-sm sm:text-base text-gray-600 leading-relaxed">
        <p className={!isExpanded ? 'line-clamp-2' : ''}>
          {complaint.description?.replace(/\.?\s*Tracking ID: IND-\d{4}-\d{5}.*$/i, '')}
        </p>
        {!isExpanded && complaint.description?.length > 80 && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
            className="text-navy font-bold text-xs hover:text-saffron transition-colors mt-0.5"
          >
            ... see more
          </button>
        )}
        {isExpanded && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
            className="text-navy font-bold text-xs hover:text-saffron transition-colors mt-1 block"
          >
            see less
          </button>
        )}
      </div>

      {complaint.imageUrl && (
        <div 
          className="relative group mb-4 overflow-hidden rounded-xl border-2 border-gray-100 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onImageClick && onImageClick(complaint.imageUrl);
          }}
        >
          <img 
            src={complaint.imageUrl} 
            alt="Complaint Attachment" 
            className="w-full h-48 sm:h-[200px] object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="bg-white/90 text-navy text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">Click to view</span>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-start gap-2 text-sm sm:text-base text-gray-500 flex-1">
          <MapPin size={18} className="text-saffron shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-tight">{complaint.location}</span>
        </div>
        {/* 🔥 NEW: View on Map Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            navigate("/map", { state: { focusComplaintId: complaint._id } });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-navy rounded-full text-xs font-bold hover:bg-gray-100 active:scale-95 transition-all shrink-0 border border-gray-200 shadow-sm"
        >
          <MapPin size={14} />
          View on Map
        </button>
      </div>
      
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <StatusBadge status={complaint.status} />
        
        {/* ✏️ UPDATED: Larger spacing & tap targets for mobile */}
        <div className="flex items-center gap-5 sm:gap-4">
          <button 
            onClick={(e) => { e.stopPropagation(); onUpvote?.(complaint._id); }}
            className="flex items-center gap-1.5 text-sm sm:text-base font-medium text-gray-500 hover:text-saffron active:scale-90 transition-all min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto justify-center"
          >
            <ThumbsUp className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" />
            <span>{complaint.upvotes || 0}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleComments?.(complaint._id); }}
            className="flex items-center gap-1.5 text-sm sm:text-base font-medium text-gray-500 hover:text-navy active:scale-90 transition-all min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto justify-center"
          >
            <MessageSquare className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" />
            <span>{Array.isArray(complaint.comments) ? complaint.comments.length : (complaint.comments || 0)}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onShare?.(complaint._id); }}
            className="flex items-center gap-1.5 text-gray-400 hover:text-navy active:scale-90 transition-all min-h-[44px] min-w-[44px] sm:min-h-auto sm:min-w-auto justify-center"
          >
            <Share2 className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" />
            <span className="text-xs sm:text-sm">{complaint.shares || 0}</span>
          </button>
        </div>
      </div>

      {complaint._id && showComments === complaint._id && (
        <div className="mt-4 pt-4 border-t border-gray-50 animate-in slide-in-from-top-2 duration-300" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Write a comment..." 
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-saffron"
            />
            <button 
              onClick={() => {
                if (commentText.trim()) {
                  onComment?.(complaint._id, commentText);
                  setCommentText('');
                }
              }}
              className="bg-navy text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-navy/90"
            >
              Post
            </button>
          </div>
          
          <div className="space-y-4 max-h-60 overflow-y-auto pr-2 mt-4 hide-scrollbar">
            {Array.isArray(complaint.comments) && complaint.comments.map((comment, i) => {
              const cName = comment.userName || 'Citizen';
              const cAvatar = cName[0].toUpperCase();
              return (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs shrink-0 mt-0.5">
                    {comment.userAvatar || cAvatar}
                  </div>
                  <div className="flex-1 bg-transparent">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-xs sm:text-sm text-gray-900">{cName}</span>
                      <span className="text-[10px] sm:text-[11px] text-gray-400 font-medium">
                        {formatCommentTime(comment.createdAt || comment.date)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 leading-snug">{comment.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintCard;
