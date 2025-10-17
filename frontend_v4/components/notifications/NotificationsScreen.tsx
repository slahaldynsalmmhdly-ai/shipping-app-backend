import React from 'react';
import './NotificationsScreen.css';

// Dummy data for notifications
const notifications = [
  {
    id: 1,
    icon: 'truck',
    title: 'تم قبول عرضك',
    description: 'تم قبول عرضك لشحنة الرياض - جدة. يرجى مراجعة التفاصيل.',
    time: 'قبل 5 دقائق',
    unread: true,
  },
  {
    id: 2,
    icon: 'check',
    title: 'اكتملت الشحنة بنجاح',
    description: 'تم توصيل شحنة الدمام - المدينة المنورة بنجاح.',
    time: 'قبل ساعة',
    unread: true,
  },
  {
    id: 3,
    icon: 'message',
    title: 'رسالة جديدة',
    description: 'لديك رسالة جديدة من "شركة النقل السريع" بخصوص شحنة أبها.',
    time: 'قبل 3 ساعات',
    unread: false,
  },
  {
    id: 4,
    icon: 'alert',
    title: 'تنبيه: تحديث مسار',
    description: 'تم تحديث مسار شحنتك رقم #12345. اضغط للمزيد من التفاصيل.',
    time: 'أمس',
    unread: false,
  },
];

const NotificationIcon: React.FC<{ icon: string }> = ({ icon }) => {
  // Return different SVG based on icon type
  switch (icon) {
    case 'truck':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16l2 2h3.5a1 1 0 001-1V9a1 1 0 00-1-1h-3.5l-2-2z" />
        </svg>
      );
    case 'check':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'message':
        return (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
        );
    default:
      return (
         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
         </svg>
      );
  }
};

const NotificationsScreen: React.FC<{ className?: string; onNavigateBack: () => void; }> = ({ className, onNavigateBack }) => {
  return (
    <div className={`app-container notifications-container ${className || ''}`}>
      <header className="notifications-header">
        <button onClick={onNavigateBack} className="back-button" aria-label="الرجوع">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1>الإشعارات</h1>
      </header>
      <main className="app-content notifications-content">
        {notifications.length > 0 ? (
          <ul className="notifications-list">
            {notifications.map((notif) => (
              <li key={notif.id} className={`notification-item ${notif.unread ? 'unread' : ''}`}>
                <div className="notification-icon-wrapper">
                  <NotificationIcon icon={notif.icon} />
                </div>
                <div className="notification-details">
                  <h3 className="notification-title">{notif.title}</h3>
                  <p className="notification-description">{notif.description}</p>
                  <p className="notification-time">{notif.time}</p>
                </div>
                {notif.unread && <div className="unread-dot"></div>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-notifications">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <h3>لا توجد إشعارات</h3>
            <p>سنعلمك عندما يكون هناك جديد.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsScreen;
