import React from 'react';
import './ProfileCompanySkeleton.css';

const ProfileCompanySkeleton: React.FC = () => {
    return (
        <div className="profile-skeleton-wrapper">
            {/* Header: Cover + Avatar */}
            <div className="skeleton-header-wrapper">
                <div className="skeleton skeleton-cover"></div>
                <div className="skeleton-avatar">
                    <div className="skeleton skeleton-avatar-inner"></div>
                </div>
            </div>

            {/* User Info and Actions */}
            <div className="skeleton-info-wrapper">
                <div className="skeleton skeleton-line title"></div>
                <div className="skeleton skeleton-line subtitle"></div>
                <div className="skeleton-actions">
                    <div className="skeleton skeleton-btn"></div>
                    <div className="skeleton skeleton-btn"></div>
                    <div className="skeleton skeleton-btn"></div>
                    <div className="skeleton skeleton-btn"></div>
                </div>
            </div>

            {/* Fleet Section */}
            <div className="skeleton-section">
                <div className="skeleton-section-header">
                    <div className="skeleton skeleton-line section-title"></div>
                    <div className="skeleton skeleton-line section-btn"></div>
                </div>
                <div className="skeleton-card-container">
                    <div className="skeleton skeleton-card"></div>
                    <div className="skeleton skeleton-card"></div>
                </div>
            </div>
            
             {/* About Section */}
            <div className="skeleton-section">
                 <div className="skeleton skeleton-line section-title"></div>
                 <div className="skeleton skeleton-line-long" style={{ width: '90%' }}></div>
                 <div className="skeleton skeleton-line-long" style={{ width: '80%' }}></div>
            </div>

            {/* Review Prompt Section */}
            <div className="skeleton-section">
                <div className="skeleton skeleton-review-prompt"></div>
            </div>

             {/* Tabs Section */}
            <div className="skeleton-section">
                <div className="skeleton-tabs">
                    <div className="skeleton-tab" style={{ margin: '0 4px', borderRadius: '4px 4px 0 0' }}></div>
                    <div className="skeleton-tab" style={{ margin: '0 4px', borderRadius: '4px 4px 0 0' }}></div>
                </div>
                <div className="skeleton skeleton-line-long" style={{ width: '100%' }}></div>
                <div className="skeleton skeleton-line-long" style={{ width: '100%', marginTop: '20px' }}></div>
            </div>
        </div>
    );
};

export default ProfileCompanySkeleton;
