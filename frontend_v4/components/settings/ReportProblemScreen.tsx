import React, { useState } from 'react';
import MediaUpload from '../shared/MediaUpload';
import './ReportProblemScreen.css';

const ReportProblemScreen: React.FC<{
  className?: string;
  onNavigateBack: () => void;
}> = ({ className, onNavigateBack }) => {
  const [description, setDescription] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const isSendDisabled = description.trim() === '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendDisabled) return;
    // In a real app, you would send the report to a server here
    console.log({
      description,
      image: mediaPreview ? 'Image attached' : 'No image attached',
    });
    // For now, just navigate back after "sending"
    onNavigateBack();
  };

  return (
    <div className={`app-container report-problem-container ${className || ''}`}>
      <form className="report-problem-form-wrapper" onSubmit={handleSubmit} id="report-problem-form">
        <header className="report-problem-header">
          <button type="button" onClick={onNavigateBack} className="header-action-btn back-btn" aria-label="الرجوع">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h1>الإبلاغ عن مشكلة</h1>
          <button type="submit" form="report-problem-form" className="header-action-btn send-btn" disabled={isSendDisabled} aria-label="إرسال">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </header>
        <main className="app-content report-problem-content">
          <div className="form-group-textarea report-description-box">
            <div className="form-group-textarea-header">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              <label htmlFor="problem-description">وصف المشكلة</label>
            </div>
            <textarea
              id="problem-description"
              rows={6}
              placeholder="يرجى وصف المشكلة التي تواجهها بالتفصيل..."
              aria-label="وصف المشكلة"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>
          <MediaUpload mediaPreview={mediaPreview} setMediaPreview={setMediaPreview} />
        </main>
      </form>
    </div>
  );
};

export default ReportProblemScreen;
