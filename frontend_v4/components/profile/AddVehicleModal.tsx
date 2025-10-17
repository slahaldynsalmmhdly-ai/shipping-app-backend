import React, { useState, useEffect } from 'react';
import MediaUpload from '../shared/MediaUpload';
import '../auth/Modal.css';
import '../signup/SignUpModal.css';
import '../ads/Ads.css'; // Re-use form-row
import type { Vehicle } from '../../App';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVehicle: (vehicleData: any) => void;
  vehicleToEdit?: Vehicle | null;
}

const AddVehicleModal: React.FC<AddVehicleModalProps> = ({ isOpen, onClose, onSaveVehicle, vehicleToEdit }) => {
  const [driverName, setDriverName] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [color, setColor] = useState('');
  const [model, setModel] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'متاح' | 'في العمل'>('متاح');

  const isEditMode = !!vehicleToEdit;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setDriverName(vehicleToEdit.driverName);
        setVehicleName(vehicleToEdit.vehicleName);
        setLicensePlate(vehicleToEdit.licensePlate);
        setVehicleType(vehicleToEdit.vehicleType);
        setColor(vehicleToEdit.color);
        setModel(vehicleToEdit.model);
        setCurrentLocation(vehicleToEdit.currentLocation);
        setImageUrl(vehicleToEdit.imageUrl);
        setStatus(vehicleToEdit.status || 'متاح');
      } else {
        setDriverName('');
        setVehicleName('');
        setLicensePlate('');
        setVehicleType('');
        setColor('');
        setModel('');
        setCurrentLocation('');
        setImageUrl(null);
        setStatus('متاح');
      }
    }
  }, [isOpen, vehicleToEdit, isEditMode]);


  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const vehicleData = {
        driverName,
        vehicleName,
        licensePlate,
        vehicleType,
        vehicleColor: color,
        vehicleModel: model,
        currentLocation,
        imageUrl,
        status,
    };
    onSaveVehicle(vehicleData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content fullscreen-modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="fullscreen-modal-header">
            <button type="button" onClick={onClose} className="close-btn" aria-label="إغلاق">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h2>{isEditMode ? 'تعديل مركبة' : 'إضافة مركبة جديدة'}</h2>
        </header>
        <main className="fullscreen-modal-main">
            <form onSubmit={handleFormSubmit} id="add-vehicle-form" className="modal-form signup-form">
                <MediaUpload
                    mediaPreview={imageUrl}
                    setMediaPreview={setImageUrl}
                    accept="image/*"
                    uploadText="إضافة صورة للمركبة"
                    uploadSubText=""
                />
                <div className="status-segment-control">
                    <button
                        type="button"
                        className={status === 'متاح' ? 'active' : ''}
                        onClick={() => setStatus('متاح')}
                    >
                        متاح
                    </button>
                    <button
                        type="button"
                        className={status === 'في العمل' ? 'active' : ''}
                        onClick={() => setStatus('في العمل')}
                    >
                        في العمل
                    </button>
                </div>
                <div className="form-group">
                    <input type="text" name="driverName" placeholder="اسم السائق" required aria-label="اسم السائق" value={driverName} onChange={e => setDriverName(e.target.value)} />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <input type="text" name="vehicleName" placeholder="اسم السيارة" required aria-label="اسم السيارة" value={vehicleName} onChange={e => setVehicleName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <input type="text" name="licensePlate" placeholder="رقم اللوحة" required aria-label="رقم اللوحة" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <input type="text" name="vehicleType" placeholder="نوع المركبة (تريلا، دينا..)" required aria-label="نوع المركبة" value={vehicleType} onChange={e => setVehicleType(e.target.value)} />
                    </div>
                     <div className="form-group">
                        <input type="text" name="currentLocation" placeholder="الموقع الحالي" required aria-label="الموقع الحالي" value={currentLocation} onChange={e => setCurrentLocation(e.target.value)} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <input type="text" name="color" placeholder="لون المركبة" required aria-label="لون المركبة" value={color} onChange={e => setColor(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <input type="text" name="model" placeholder="موديل المركبة" required aria-label="موديل المركبة" value={model} onChange={e => setModel(e.target.value)} />
                    </div>
                </div>
            </form>
        </main>
        <footer className="fullscreen-modal-footer">
            <button type="submit" form="add-vehicle-form" className="btn btn-primary btn-awesome-save">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span>{isEditMode ? 'حفظ التعديلات' : 'حفظ المركبة'}</span>
            </button>
        </footer>
      </div>
    </div>
  );
};

export default AddVehicleModal;