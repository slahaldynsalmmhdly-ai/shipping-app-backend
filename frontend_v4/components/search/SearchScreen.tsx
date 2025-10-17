import React from 'react';
import './SearchScreen.css';

const SearchScreen: React.FC<{ className?: string; onNavigateBack: () => void; }> = ({ className, onNavigateBack }) => {
  
  const recentSearches = ['تريلا من الرياض الى جدة', 'دينا للإيجار', 'شركة النقل السريع'];
  const quickFilters = ['شاحنة براد', 'سطحة', 'نقل أثاث', 'من الدمام'];

  return (
    <div className={`app-container search-container ${className || ''}`}>
      <header className="search-header">
        <div className="search-input-wrapper">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          <input type="search" placeholder="ابحث عن شحنة، شاحنة، أو شركة..." autoFocus />
          <button onClick={onNavigateBack} className="back-button-in-search" aria-label="الرجوع">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button className="mic-button" aria-label="بحث صوتي">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
      </header>
      <main className="app-content search-content">
        <section className="search-section">
          <h2 className="search-section-title">عمليات البحث الأخيرة</h2>
          <ul className="recent-searches-list">
            {recentSearches.map((term, index) => (
              <li key={index} className="recent-search-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{term}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="search-section">
          <h2 className="search-section-title">بحث سريع</h2>
          <div className="quick-filter-grid">
            {quickFilters.map((filter, index) => (
              <button key={index} className="quick-filter-btn">{filter}</button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default SearchScreen;