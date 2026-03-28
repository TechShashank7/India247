import React from 'react';
import { MapPin, MessageSquare, Share2, ThumbsUp } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useAuth } from '../context/AuthContext';

const ComplaintCard = ({ complaint, onImageClick, onUpvote, onComment, onShare, showComments, toggleComments }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [commentText, setCommentText] = React.useState('');
  const { user } = useAuth();

  const formatTime = (date) => {
    if (!date) return 'Just now';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwner = user?.uid && complaint.user?.uid === user.uid;
  // If the currently logged in user is the one who submitted it, show their real name, otherwise show what's in DB (which might be 'Anonymous')
  const authorName = isOwner ? (user?.name || complaint.user?.name) : (complaint.user?.name || 'Citizen');
  const avatarLetter = authorName && authorName !== 'Anonymous' ? authorName[0] : (complaint.title ? complaint.title[0] : 'C');

  return (
    <div className="card hover:-translate-y-1 transition-transform cursor-pointer">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-sm">
            {complaint.user?.avatar || avatarLetter}
          </div>
          <div>
            <p className="font-semibold text-sm">{authorName}</p>
            <p className="text-xs text-gray-400">{formatTime(complaint.createdAt)}</p>
          </div>
        </div>
        <div className="bg-gray-100 px-2 py-1 rounded-md text-xs font-semibold text-gray-600">
          {complaint.category}
        </div>
      </div>
      
      <h3 className="font-semibold text-lg mb-2">{complaint.title}</h3>
      <div className="mb-4 text-sm text-gray-600">
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
            className="w-full h-[200px] object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="bg-white/90 text-navy text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">Click to view</span>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <MapPin size={16} className="text-saffron" />
        <span>{complaint.location}</span>
      </div>
      
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <StatusBadge status={complaint.status} />
        
        <div className="flex items-center gap-4">
          <button 
            onClick={(e) => { e.stopPropagation(); onUpvote?.(complaint._id); }}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-saffron transition-colors"
          >
            <ThumbsUp size={18} />
            <span>{complaint.upvotes || 0}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleComments?.(complaint._id); }}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-navy transition-colors"
          >
            <MessageSquare size={18} />
            <span>{Array.isArray(complaint.comments) ? complaint.comments.length : (complaint.comments || 0)}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onShare?.(complaint._id); }}
            className="text-gray-400 hover:text-navy transition-colors"
          >
            <Share2 size={18} />
            <span className="ml-1 text-xs">{complaint.shares || 0}</span>
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
          
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {Array.isArray(complaint.comments) && complaint.comments.map((comment, i) => (
              <div key={i} className="bg-gray-50 p-2 rounded-lg">
                <p className="text-xs text-gray-800">{comment.text}</p>
                <p className="text-[10px] text-gray-400 mt-1">{formatTime(comment.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintCard;
