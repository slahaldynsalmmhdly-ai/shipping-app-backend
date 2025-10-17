import React from 'react';

const ProfileIndividualSkeleton: React.FC = () => {
    return (
        <div className="profile-individual-skeleton">
            <div className="skeleton skeleton-avatar-individual"></div>
            <div className="skeleton skeleton-line-individual title"></div>
            <div className="skeleton skeleton-line-individual subtitle"></div>
            <div className="skeleton skeleton-line-individual about" style={{ width: '80%' }}></div>
            <div className="skeleton skeleton-line-individual about" style={{ width: '60%' }}></div>
            <div className="profile-individual-actions-grid-skeleton">
                <div className="skeleton skeleton-action-icon"></div>
                <div className="skeleton skeleton-action-icon"></div>
                <div className="skeleton skeleton-action-icon"></div>
                <div className="skeleton skeleton-action-icon"></div>
                <div className="skeleton skeleton-action-icon"></div>
            </div>
        </div>
    );
};

export default ProfileIndividualSkeleton;