import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../config';
import './CreatePostScreen.css';

// Action Sheet component, similar to Facebook's "Add to your post"
const PostActionSheet: React.FC<{
  onClose: () => void;
  onAddMedia: () => void;
}> = ({ onClose, onAddMedia }) => (
  <div className="post-action-sheet-overlay" onClick={onClose}>
    <div className="post-action-sheet-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-handle-bar"></div>
      <h4>إضافة إلى منشورك</h4>
      <button type="button" className="action-sheet-item" onClick={onAddMedia}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="icon-photo">
            <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-3.69l-2.76-2.76a.75.75 0 00-1.06 0l-2.122 2.121-1.768-1.768a.75.75 0 00-1.06 0l-4.243 4.243zM4.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
        </svg>
        <span>صورة/فيديو</span>
      </button>
       <button type="button" className="action-sheet-item">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="icon-tag">
          <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" />
        </svg>
        <span>الإشارة لأشخاص</span>
      </button>
      <button type="button" className="action-sheet-item">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="icon-location">
            <path fillRule="evenodd" d="M10 2a5 5 0 00-5 5c0 3.866 5 9 5 9s5-5.134 5-9a5 5 0 00-5-5zm0 7a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" />
        </svg>
        <span>الموقع</span>
      </button>
    </div>
  </div>
);


interface CreatePostScreenProps {
  className?: string;
  onNavigateBack: () => void;
  onPostCreated: () => void;
  setSavingState: (state: { isSaving: boolean; messages: string[] }) => void;
  user: any;
}

const CreatePostScreen: React.FC<CreatePostScreenProps> = ({ className, onNavigateBack, onPostCreated, setSavingState, user }) => {
  const [postText, setPostText] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isActionSheetOpen, setActionSheetOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFormValid = postText.trim() !== '' || mediaPreview !== null;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto'; // Reset height
        const scrollHeight = textarea.scrollHeight;
        textarea.style.height = `${scrollHeight}px`;
    }
  }, [postText]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSavingState({ isSaving: true, messages: ['جاري نشر منشورك...'] });

    try {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('يجب تسجيل الدخول لإنشاء منشور.');

        let mediaPayload = [];

        if (mediaPreview && mediaType) {
            const blob = await fetch(mediaPreview).then(res => res.blob());
            const formData = new FormData();
            formData.append('file', blob, `upload.${mediaType === 'image' ? 'jpg' : 'mp4'}`);

            const uploadRes = await fetch(`${API_BASE_URL}/api/upload/single`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (!uploadRes.ok) {
                const errorData = await uploadRes.json();
                throw new Error(errorData.message || 'فشل تحميل الوسائط.');
            }

            const uploadData = await uploadRes.json();
            mediaPayload.push({
                url: uploadData.filePath,
                type: uploadData.fileType || mediaType,
            });
        }
        
        const postPayload = {
            text: postText,
            media: mediaPayload,
        };

        const postRes = await fetch(`${API_BASE_URL}/api/v1/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(postPayload),
        });

        if (!postRes.ok) {
            const errorData = await postRes.json();
            throw new Error(errorData.message || 'فشل في إنشاء المنشور.');
        }

        onPostCreated(); // This will navigate back and trigger a refetch

    } catch (error: any) {
        alert(error.message);
        setSavingState({ isSaving: false, messages: [] });
    } finally {
        // Delay hiding to allow for screen transition
        setTimeout(() => setSavingState({ isSaving: false, messages: [] }), 500);
    }
  };

  const handleOpenActionSheet = () => setActionSheetOpen(true);
  const handleCloseActionSheet = () => setActionSheetOpen(false);
  
  const handleAddMediaClick = () => {
    handleCloseActionSheet();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaType(file.type.startsWith('image') ? 'image' : 'video');
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveMedia = () => {
      setMediaPreview(null);
      setMediaType(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  return (
    <div className={`app-container create-post-container ${className || ''}`}>
      <form className="create-post-form-wrapper" onSubmit={handleFormSubmit} id="create-post-form">
        <header className="create-post-header">
          <button type="button" onClick={onNavigateBack} className="post-header-btn close-btn" aria-label="إغلاق">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h1>إنشاء منشور</h1>
          <button type="submit" form="create-post-form" className="post-header-btn publish-btn" disabled={!isFormValid} aria-label="نشر">
            نشر
          </button>
        </header>
        <main className="app-content create-post-content">
          <div className="post-author-info">
            <img src={user?.avatar ? `${API_BASE_URL}/${user.avatar}` : `https://ui-avatars.com/api/?name=${user?.name?.charAt(0)}&background=3498db&color=fff&size=128`} alt={user?.name} className="post-author-avatar" />
            <div className="post-author-name">{user?.name}</div>
          </div>
          <textarea
            ref={textareaRef}
            placeholder={user ? `بماذا تفكر يا ${user.name}؟` : 'بماذا تفكر؟'}
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            rows={1}
            className="post-textarea"
          />
          {mediaPreview && (
            <div className="post-media-preview">
                 {mediaType === 'image' ? (
                    <img src={mediaPreview} alt="Preview" />
                 ) : (
                    <video src={mediaPreview} controls muted loop autoPlay playsInline />
                 )}
                 <button type="button" onClick={handleRemoveMedia} className="remove-media-btn" aria-label="إزالة الوسائط">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
            </div>
          )}
        </main>

        <footer className="create-post-footer">
          <button type="button" className="add-to-post-btn" onClick={handleOpenActionSheet}>
            <span>إضافة إلى منشورك</span>
            <div className="action-icons-preview">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="icon-photo">
                    <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-3.69l-2.76-2.76a.75.75 0 00-1.06 0l-2.122 2.121-1.768-1.768a.75.75 0 00-1.06 0l-4.243 4.243zM4.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="icon-tag">
                    <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="icon-location">
                    <path fillRule="evenodd" d="M10 2a5 5 0 00-5 5c0 3.866 5 9 5 9s5-5.134 5-9a5 5 0 00-5-5zm0 7a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" />
                </svg>
            </div>
          </button>
        </footer>

        {isActionSheetOpen && <PostActionSheet onClose={handleCloseActionSheet} onAddMedia={handleAddMediaClick} />}

        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept="image/*,video/*"
        />
      </form>
    </div>
  );
};

export default CreatePostScreen;