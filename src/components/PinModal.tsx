import { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  title: string;
  isSetup?: boolean;
}

export default function PinModal({ isOpen, onClose, onSubmit, title, isSetup = false }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    if (!/^\d+$/.test(pin)) {
      setError('PIN must contain only numbers');
      return;
    }

    if (isSetup) {
      if (confirmPin.length !== 4) {
        setError('Please confirm your PIN');
        return;
      }
      if (pin !== confirmPin) {
        setError('PINs do not match');
        return;
      }
    }

    onSubmit(pin);
    setPin('');
    setConfirmPin('');
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, isConfirm = false) => {
    if (e.key === 'Enter') {
      if (isSetup && !isConfirm && pin.length === 4) {
        return;
      }
      handleSubmit();
    }
  };

  const handlePinChange = (value: string) => {
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setPin(value);
      setError('');
    }
  };

  const handleConfirmPinChange = (value: string) => {
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setConfirmPin(value);
      setError('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{title}</h2>
          </div>
          {!isSetup && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {isSetup ? 'Create 4-Digit PIN' : 'Enter Your PIN'}
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, false)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-center text-2xl tracking-widest"
              placeholder="••••"
              maxLength={4}
              autoFocus
            />
          </div>

          {isSetup && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => handleConfirmPinChange(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, true)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-center text-2xl tracking-widest"
                placeholder="••••"
                maxLength={4}
              />
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm font-medium">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {isSetup ? 'Set PIN' : 'Verify PIN'}
          </button>

          {isSetup && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your PIN will be required for all future logins. Keep it secure and memorable.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
