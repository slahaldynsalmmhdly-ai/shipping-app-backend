import React from 'react';
import './FleetManagementScreen.css';
import type { Vehicle } from '../../App';

interface FleetManagementScreenProps {
  className?: string;
  onNavigateBack: () => void;
  fleet: Vehicle[];
  onOpenAddVehicleModal: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
}

const FleetManagementScreen: React.FC<FleetManagementScreenProps> = ({ className, onNavigateBack, fleet, onOpenAddVehicleModal, onEditVehicle, onDeleteVehicle }) => {
  return (
    <div className={`app-container fleet-management-container ${className || ''}`}>
      <header className="fleet-header">
        <button onClick={onNavigateBack} className="back-button" aria-label="الرجوع">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1>إدارة الأسطول</h1>
      </header>
      <main className="app-content fleet-content">
        {fleet.length > 0 ? (
          <div className="fleet-list">
            {fleet.map((vehicle) => (
              <div key={vehicle.id} className="fleet-list-item">
                <img src={vehicle.imageUrl || `https://ui-avatars.com/api/?name=T&background=bdc3c7&color=fff&size=50`} alt={vehicle.vehicleName} className="fleet-item-avatar" />
                <div className="fleet-item-details">
                  <h3>{vehicle.vehicleName}</h3>
                  <p>{vehicle.driverName} - {vehicle.licensePlate}</p>
                  <span className={`vehicle-status-badge ${vehicle.status === 'في العمل' ? 'busy' : 'available'}`}>
                    {vehicle.status || 'متاح'}
                  </span>
                </div>
                <div className="fleet-item-actions">
                  <button className="fleet-action-btn" aria-label="تعديل" onClick={() => onEditVehicle(vehicle)}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" /></svg></button>
                  <button className="fleet-action-btn delete" aria-label="حذف" onClick={() => onDeleteVehicle(vehicle.id)}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193v-.443A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" /></svg></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-fleet">
            <h3>لم تتم إضافة أي مركبات</h3>
            <p>ابدأ بإضافة مركبات أسطولك لعرضها للمستخدمين.</p>
          </div>
        )}
      </main>
       <button className="add-vehicle-fab" aria-label="إضافة مركبة جديدة" onClick={onOpenAddVehicleModal}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
       </button>
    </div>
  );
};

export default FleetManagementScreen;