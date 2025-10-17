import React, { useState, useEffect } from 'react';
import './SavingIndicator.css';

interface SavingIndicatorProps {
    messages: string[];
}

const SavingIndicator: React.FC<SavingIndicatorProps> = ({ messages }) => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    useEffect(() => {
        if (messages.length > 1) {
            const intervalId = setInterval(() => {
                setCurrentMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
            }, 2500); // Change message every 2.5 seconds

            return () => clearInterval(intervalId);
        }
    }, [messages]);

    return (
        <div className="saving-indicator-overlay">
            <div className="saving-indicator-content">
                <div className="loading-dots">
                    <div className="dot1"></div>
                    <div className="dot2"></div>
                    <div className="dot3"></div>
                </div>
                <p key={currentMessageIndex} className="saving-message">
                    {messages[currentMessageIndex] || 'جاري المعالجة...'}
                </p>
            </div>
        </div>
    );
};

export default SavingIndicator;