import { useState } from 'react';
import { firebaseDb } from '../lib/firebaseOperations';
import { Employee } from '../lib/firebase';
import { User, Lock } from 'lucide-react';
import { getLocalDateTime } from '../lib/dateUtils';
import PinModal from './PinModal';

interface ImprovedLoginFlowProps {
  onSuccess: (employee: Employee) => void;
}

export default function ImprovedLoginFlow({ onSuccess }: ImprovedLoginFlowProps) {
  const [name, setName] = useState('');
  const [tempEmployee, setTempEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinMode, setPinMode] = useState<'setup' | 'verify'>('setup');

  const handleNameSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    const { data: employee } = await firebaseDb
      .from('employees')
      .select('*')
      .eq('name', name.trim())
      .maybeSingle();

    if (!employee) {
      setError('Employee name not found. Please enter your exact full name as registered or contact admin.');
      return;
    }

    setTempEmployee(employee);
    setError('');

    if (employee.security_pin) {
      setPinMode('verify');
    } else {
      setPinMode('setup');
    }

    setShowPinModal(true);
  };

  const handlePinSetup = async (pin: string) => {
    if (!tempEmployee) return;

    console.log('[PIN] Setting up PIN for employee:', tempEmployee.id);

    const { error: updateError } = await firebaseDb
      .from('employees')
      .update({
        security_pin: pin,
        pin_set_at: getLocalDateTime()
      })
      .eq('id', tempEmployee.id);

    if (!updateError) {
      console.log('[PIN] PIN setup successful');
      setShowPinModal(false);
      onSuccess({ ...tempEmployee, security_pin: pin, pin_set_at: getLocalDateTime() });
    } else {
      console.error('[PIN] Failed to set up PIN:', updateError);
      setError('Failed to set up PIN. Please try again.');
      setShowPinModal(false);
    }
  };

  const handlePinVerify = async (pin: string) => {
    if (!tempEmployee) return;

    console.log('[PIN] Verifying PIN for employee:', tempEmployee.id);

    if (pin === tempEmployee.security_pin) {
      console.log('[PIN] PIN verification successful');
      setShowPinModal(false);
      onSuccess(tempEmployee);
    } else {
      console.log('[PIN] PIN verification failed');
      setError('Incorrect PIN. Please try again.');
      setShowPinModal(false);
      setTempEmployee(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <User className="w-4 h-4 inline mr-2" />
          Your Full Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-base sm:text-lg"
          placeholder="Enter your full name"
          autoFocus
        />
      </div>

      <button
        onClick={handleNameSubmit}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-base sm:text-lg"
      >
        <User className="w-5 h-5 sm:w-6 sm:h-6" />
        Continue
      </button>

      {showPinModal && (
        <PinModal
          isOpen={showPinModal}
          onClose={() => {
            setShowPinModal(false);
            setTempEmployee(null);
            setError('');
          }}
          onSubmit={pinMode === 'setup' ? handlePinSetup : handlePinVerify}
          title={pinMode === 'setup' ? 'Set Up Your PIN' : 'Enter Your PIN'}
          isSetup={pinMode === 'setup'}
        />
      )}
    </div>
  );
}
