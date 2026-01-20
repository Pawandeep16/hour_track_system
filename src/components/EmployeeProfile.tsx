import { useState } from 'react';
import { firebaseDb } from '../lib/firebaseOperations';
import { Employee } from '../lib/firebase';
import { User, Lock, Briefcase, Save, X, Camera } from 'lucide-react';
import { getLocalDateTime } from '../lib/dateUtils';
import PinModal from './PinModal';

interface EmployeeProfileProps {
  employee: Employee;
  onClose: () => void;
  onUpdate: (employee: Employee) => void;
}

export default function EmployeeProfile({ employee, onClose, onUpdate }: EmployeeProfileProps) {
  const [name, setName] = useState(employee.name);
  const [profileImage, setProfileImage] = useState(employee.profile_image_url || '');
  const [showPinReset, setShowPinReset] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setIsSaving(true);
    setError('');

    const { error: updateError } = await firebaseDb
      .from('employees')
      .update({
        name,
        profile_image_url: profileImage || null
      })
      .eq('id', employee.id);

    if (updateError) {
      setError('Failed to update profile');
      setIsSaving(false);
      return;
    }

    const updatedEmployee = { ...employee, name, profile_image_url: profileImage || null };
    onUpdate(updatedEmployee);
    setSuccess('Profile updated successfully!');
    setIsSaving(false);

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleResetPin = async (newPin: string) => {
    const { error } = await firebaseDb
      .from('employees')
      .update({
        security_pin: newPin,
        pin_set_at: getLocalDateTime()
      })
      .eq('id', employee.id);

    if (!error) {
      const updatedEmployee = {
        ...employee,
        security_pin: newPin,
        pin_set_at: getLocalDateTime()
      };
      onUpdate(updatedEmployee);
      setShowPinReset(false);
      setSuccess('PIN updated successfully!');
    } else {
      setError('Failed to update PIN');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Employee Profile</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-200"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-blue-200">
                  <User className="w-16 h-16 text-white" />
                </div>
              )}
              <div className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg border-2 border-blue-500">
                <Camera className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 w-full max-w-md">
              <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                Profile Image URL
              </label>
              <input
                type="url"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-sm"
                placeholder="https://example.com/image.jpg"
              />
              <p className="text-xs text-gray-500 mt-1 text-center">Enter a URL to your profile image</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Briefcase className="w-4 h-4 inline mr-2" />
              Position
            </label>
            <input
              type="text"
              value={employee.position}
              disabled
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Position can only be changed by admin</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Employee Code
            </label>
            <input
              type="text"
              value={employee.employee_code}
              disabled
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed font-mono"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowPinReset(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              <Lock className="w-5 h-5" />
              Change PIN
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <PinModal
        isOpen={showPinReset}
        onClose={() => setShowPinReset(false)}
        onSubmit={handleResetPin}
        title="Change Your PIN"
        isSetup={true}
      />
    </div>
  );
}
