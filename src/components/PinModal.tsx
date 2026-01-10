import { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => Promise<void> | void;
  title: string;
  isSetup?: boolean;
}

export default function PinModal({ isOpen, onClose, onSubmit, title, isSetup = false }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setPin('');
    setConfirmPin('');
    setError('');
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (isSubmitting) return;
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

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(pin);
      setPin('');
      setConfirmPin('');
      setError('');
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('[PinModal] Error submitting PIN:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, isConfirm = false) => {
    if (e.key === 'Enter' && !isSubmitting) {
      if (isSetup && !isConfirm && pin.length === 4) {
        document.querySelector<HTMLInputElement>('input[type="password"]:not([value="' + pin + '"])')?.focus();
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
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 disabled:text-gray-300 transition-colors"
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
              disabled={isSubmitting}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-center text-2xl tracking-widest"
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
                disabled={isSubmitting}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-center text-2xl tracking-widest"
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
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {isSubmitting ? 'Processing...' : (isSetup ? 'Set PIN' : 'Verify PIN')}
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
