import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import MediaUpload from '../shared/MediaUpload';
import '../auth/Modal.css'; // Reuse modal styles
import './Profile.css'; // Add specific review modal styles

const InteractiveStarRating: React.FC<{ rating: number; onRate: (rate: number) => void }> = ({ rating, onRate }) => {
    const [hoverRating, setHoverRating] = useState(0);

    return (
        <div className="interactive-stars">
        {[...Array(5)].map((_, i) => {
            const rate = i + 1;
            return (
            <svg
                key={rate}
                viewBox="0 0 24 24"
                fill="currentColor"
                className={rate <= (hoverRating || rating) ? 'active' : ''}
                onClick={() => onRate(rate)}
                onMouseEnter={() => setHoverRating(rate)}
                onMouseLeave={() => setHoverRating(0)}
            >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
            );
        })}
        </div>
    );
};


interface AddReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId?: string;
  onReviewAdded: (newReview: any) => void;
}

const AddReviewModal: React.FC<AddReviewModalProps> = ({ isOpen, onClose, profileId, onReviewAdded }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [media, setMedia] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setComment('');
      setError(null);
      setIsLoading(false);
      setMedia([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
        setError('يرجى تحديد تقييم بالنجوم.');
        return;
    }
    if (!profileId) {
        setError('لا يمكن تحديد الملف الشخصي المراد تقييمه.');
        return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
        setError('يجب تسجيل الدخول لإضافة تقييم.');
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
        const response = await fetch(`${API_BASE_URL}/api/reviews/${profileId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                rating,
                comment,
                media,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            let errorMessage = data.message || 'فشل إرسال التقييم.';
            throw new Error(errorMessage);
        }
        
        onReviewAdded(data); // Pass the new review object back
        onClose();
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle-bar"></div>
        <h2>أضف تقييمك وتعليقك</h2>
        {error && <p className="modal-error">{error}</p>}
        <form onSubmit={handleFormSubmit} className="review-modal-content">
            <MediaUpload
                mediaPreview={media.length > 0 ? media[0] : null}
                setMediaPreview={(url) => {
                    if (url) {
                        setMedia(prev => [...prev, url]);
                    }
                }}
                accept="image/*,video/*"
                uploadText="إضافة صور أو فيديو (اختياري)"
                uploadSubText=""
                multiple={true}
            />
          <InteractiveStarRating rating={rating} onRate={setRating} />
          <textarea
            placeholder="اكتب تعليقك هنا لوصف تجربتك مع الشركة..."
            required
            aria-label="اكتب تعليقك"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isLoading}
          ></textarea>
          <button type="submit" className="btn btn-primary modal-btn" disabled={isLoading}>
            {isLoading ? 'جارٍ الإرسال...' : 'إرسال التقييم'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddReviewModal;