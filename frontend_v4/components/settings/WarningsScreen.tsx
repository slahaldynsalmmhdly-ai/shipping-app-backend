import React from 'react';
import './StaticPage.css';

const WarningsScreen: React.FC<{
  className?: string;
  onNavigateBack: () => void;
}> = ({ className, onNavigateBack }) => {
  return (
    <div className={`app-container static-page-container ${className || ''}`}>
      <header className="static-page-header">
        <button onClick={onNavigateBack} className="back-button" aria-label="الرجوع">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1>تحذيرات هامة</h1>
      </header>
      <main className="app-content static-page-content">
        <p className="warning-intro">
            لضمان تجربة آمنة وموثوقة على تطبيق 'شحن سريع'، نرجو من جميع المستخدمين قراءة التحذيرات التالية بعناية والالتزام بها:
        </p>

        <ul className="warnings-list">
            <li className="warning-item">
                <div className="warning-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>
                <div className="warning-text">
                    <h3>لا تقم بتحويل أي مبالغ مالية مقدمًا</h3>
                    <p>تجنب دفع أي عربون أو مبلغ مالي قبل التأكد من جدية الطرف الآخر واستلام بوليصة شحن أو عقد رسمي. المنصة غير مسؤولة عن أي معاملات تتم خارجها.</p>
                </div>
            </li>
            <li className="warning-item">
                <div className="warning-icon">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <div className="warning-text">
                    <h3>احذر من الشركات الوهمية</h3>
                    <p>تحقق من هوية الشركة أو الفرد الذي تتعامل معه. اطلب رؤية السجل التجاري للشركات أو هوية الأفراد قبل إتمام أي اتفاق.</p>
                </div>
            </li>
             <li className="warning-item">
                <div className="warning-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.53-0.417m-4.47-4.47a9.75 9.75 0 01-1.326-4.328C3 7.444 7.03 3.75 12 3.75c4.97 0 9 3.694 9 8.25z" />
                    </svg>
                </div>
                <div className="warning-text">
                    <h3>التواصل داخل التطبيق</h3>
                    <p>نوصي بشدة بإبقاء جميع المحادثات والمفاوضات داخل نظام الرسائل الخاص بالتطبيق لتوثيقها وحمايتك.</p>
                </div>
            </li>
            <li className="warning-item">
                <div className="warning-icon">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="warning-text">
                    <h3>فحص الشاحنة والبضاعة</h3>
                    <p>قبل التحميل، تأكد من أن الشاحنة مطابقة للمواصفات المطلوبة. وقبل الانطلاق، تأكد من أن البضاعة مطابقة للوصف المذكور في الإعلان.</p>
                </div>
            </li>
        </ul>
      </main>
    </div>
  );
};

export default WarningsScreen;
