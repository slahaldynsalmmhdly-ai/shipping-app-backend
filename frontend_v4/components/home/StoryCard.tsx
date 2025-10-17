import React from 'react';
import './StoryCard.css';

interface StoryCardProps {
    isAddStory?: boolean;
    avatarUrl?: string;
    name: string;
    onOpenProfile?: () => void;
}

const StoryCard: React.FC<StoryCardProps> = ({ isAddStory = false, avatarUrl, name, onOpenProfile }) => {
    return (
        <div className="story-card" role="button" tabIndex={0} aria-label={name} onClick={isAddStory ? undefined : onOpenProfile}>
            <div className={`story-avatar-wrapper ${isAddStory ? 'add-story' : ''}`}>
                {isAddStory ? (
                    <div className="add-story-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </div>
                ) : (
                    <img src={avatarUrl} alt={`${name}'s story`} className="story-avatar" />
                )}
            </div>
            <p className="story-name">{name}</p>
        </div>
    );
};

export default StoryCard;