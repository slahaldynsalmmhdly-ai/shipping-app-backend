import React, { useRef, useState } from 'react';
import './MediaUpload.css';

const MediaUpload: React.FC<{
  mediaPreview: string | null;
  setMediaPreview: (preview: string | null) => void;
  accept?: string;
  uploadText?: string;
  uploadSubText?: string;
  multiple?: boolean;
}> = ({
  mediaPreview,
  setMediaPreview,
  accept = 'image/*,video/*',
  uploadText = 'إضافة صورة أو فيديو',
  uploadSubText = '(اختياري)',
  multiple = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // FIX: Explicitly type `files` as an array of `File` objects to resolve type errors.
      const files: File[] = Array.from(e.target.files);

      // For single-file mode, or if not multiple, process the first one
      if (!multiple) {
        const file = files[0];
        setMediaType(file.type.startsWith('image') ? 'image' : 'video');
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        return;
      }

      // For multi-file mode, iterate and call the callback for each
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
      // Set the internal preview type based on the first file
      setMediaType(files[0].type.startsWith('image') ? 'image' : 'video');
    }
  };

  const handleRemoveMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMediaPreview(null);
    setMediaType(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  return (
    <div className="media-upload-area" onClick={handleUploadClick} role="button" tabIndex={0} aria-label="Upload image or video">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept={accept}
        multiple={multiple}
      />
      {mediaPreview ? (
        <div className="media-preview-container">
          {mediaType === 'image' ? (
             <img src={mediaPreview} alt="Media preview" className="media-preview" />
          ) : (
             <video src={mediaPreview} className="media-preview" muted loop autoPlay playsInline />
          )}
          <button className="remove-media-btn" onClick={handleRemoveMedia} aria-label="Remove media">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="media-upload-placeholder">
          <svg className="media-upload-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" >
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <p>{uploadText}</p>
          {uploadSubText && <span>{uploadSubText}</span>}
        </div>
      )}
    </div>
  );
};

export default MediaUpload;