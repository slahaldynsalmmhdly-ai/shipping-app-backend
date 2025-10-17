import React, { useState } from 'react';
import MediaUpload from '../shared/MediaUpload';
import './ReportChatScreen.css';
import '../reports/ReportPostScreen.css'; // Re-use some form styles

interface ReportChatScreenProps {
  className?: string;
  onNavigateBack: () => void;
  reportType: string; // e.g., "الإبلاغ عن المستخدم"
  user: { name: string; avatarUrl: string; } | null;
}

const ReportChatScreen: React.FC<ReportChatScreenProps> = ({ className, onNavigateBack, reportType, user }) => {
  const [details, setDetails] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (details.trim() === '') return;
    console.log(`Submitting report: ${reportType} for user ${user.name} with details: ${details}`);
    onNavigateBack();
  };

  const isSendDisabled = details.trim() === '';

  return (
    <div className={`app-container report-chat-container ${className || ''}`}>
      <form onSubmit={handleSubmit} id="report-chat-form" className="report-problem-form-wrapper">
        <header className="report-problem-header">
          <button type="button" onClick={onNavigateBack} className="header-action-btn back-btn" aria-label="الرجوع">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h1>{reportType}</h1>
          <button type="submit" form="report-chat-form" className="header-action-btn send-btn" disabled={isSendDisabled} aria-label="إرسال">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </header>
        <main className="app-content report-problem-content">
          <div className="reported-user-info-chat">
            <img src={user.avatarUrl} alt={user.name} />
            <p>أنت تبلغ عن <strong>{user.name}</strong></p>
          </div>

          <div className="form-group-textarea report-description-box">
            <div className="form-group-textarea-header">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              <label htmlFor="report-details">تفاصيل المشكلة</label>
            </div>
            <textarea
              id="report-details"
              rows={6}
              placeholder="يرجى وصف المشكلة بالتفصيل..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required
            ></textarea>
          </div>

          <MediaUpload
            mediaPreview={mediaPreview}
            setMediaPreview={setMediaPreview}
            uploadText="إرفاق دليل (صورة أو فيديو)"
            uploadSubText="(اختياري)"
          />
        </main>
      </form>
    </div>
  );
};

export default ReportChatScreen;