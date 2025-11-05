import { useState } from 'react';
import { supabase, Employee } from '../lib/supabase';
import { Mail, Lock, X } from 'lucide-react';
import { generateVerificationCode, isCodeExpired } from '../lib/emailService';
import PinModal from './PinModal';

interface EmailLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (employee: Employee) => void;
}

export default function EmailLoginModal({ isOpen, onClose, onSuccess }: EmailLoginModalProps) {
  const [step, setStep] = useState<'email' | 'verify' | 'pin'>('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [tempEmployee, setTempEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  if (!isOpen) return null;

  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .eq('email_verified', true)
      .maybeSingle();

    if (!employee) {
      setError('No verified account found with this email. Please verify your email in your profile first.');
      return;
    }

    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const { error: updateError } = await supabase
      .from('employees')
      .update({
        verification_code: code,
        verification_code_expires: expiresAt.toISOString()
      })
      .eq('id', employee.id);

    if (updateError) {
      setError('Failed to send verification code');
      return;
    }

    alert(`Verification code: ${code}\n\n(In production, this would be sent to your email)`);
    setTempEmployee(employee);
    setStep('verify');
    setError('');
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || !tempEmployee) return;

    const { data } = await supabase
      .from('employees')
      .select('verification_code, verification_code_expires')
      .eq('id', tempEmployee.id)
      .maybeSingle();

    if (!data) {
      setError('Employee not found');
      return;
    }

    if (isCodeExpired(data.verification_code_expires)) {
      setError('Verification code has expired. Please request a new one.');
      return;
    }

    if (data.verification_code !== verificationCode) {
      setError('Invalid verification code');
      return;
    }

    await supabase
      .from('employees')
      .update({
        verification_code: null,
        verification_code_expires: null
      })
      .eq('id', tempEmployee.id);

    setStep('pin');
    setShowPinModal(true);
    setError('');
  };

  const handlePinVerify = async (pin: string) => {
    if (!tempEmployee) return;

    if (pin === tempEmployee.security_pin) {
      onSuccess(tempEmployee);
      handleClose();
    } else {
      alert('Incorrect PIN. Please try again.');
    }
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setVerificationCode('');
    setTempEmployee(null);
    setError('');
    setShowPinModal(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {step === 'email' && 'Sign In with Email'}
            {step === 'verify' && 'Verify Email'}
            {step === 'pin' && 'Enter PIN'}
          </h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {step === 'email' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSendCode()}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="your.email@example.com"
                autoFocus
              />
            </div>
            <button
              onClick={handleSendCode}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Send Verification Code
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Enter the 6-digit verification code sent to <strong>{email}</strong>
            </p>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value);
                  setError('');
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleVerifyCode()}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Verify
              </button>
              <button
                onClick={() => setStep('email')}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        <PinModal
          isOpen={showPinModal}
          onClose={() => {
            setShowPinModal(false);
            handleClose();
          }}
          onSubmit={handlePinVerify}
          title="Enter Your PIN"
          isSetup={false}
        />
      </div>
    </div>
  );
}
