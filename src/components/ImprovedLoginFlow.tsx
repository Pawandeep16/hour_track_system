import { useState } from 'react';
import { supabase, Employee } from '../lib/supabase';
import { User, Mail, Lock, X, CheckCircle } from 'lucide-react';
import { generateVerificationCode, isCodeExpired, sendVerificationEmail } from '../lib/emailService';
import { getLocalDateTime } from '../lib/dateUtils';
import PinModal from './PinModal';

interface ImprovedLoginFlowProps {
  onSuccess: (employee: Employee) => void;
}

type LoginStep = 'name' | 'email-setup' | 'verify-email' | 'pin-setup' | 'pin-verify';

export default function ImprovedLoginFlow({ onSuccess }: ImprovedLoginFlowProps) {
  const [step, setStep] = useState<LoginStep>('name');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [tempEmployee, setTempEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinMode, setPinMode] = useState<'setup' | 'verify'>('setup');

  const handleNameSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    const { data: employee } = await supabase
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

    // Check if employee has verified email and PIN
    if (employee.email_verified && employee.security_pin) {
      // Existing user: go to PIN verification
      setPinMode('verify');
      setShowPinModal(true);
    } else if (employee.email && !employee.email_verified) {
      // Has email but not verified: verify first
      setEmail(employee.email);
      await sendVerificationCode(employee);
      setStep('verify-email');
    } else if (!employee.email) {
      // New user: needs to set up email
      setStep('email-setup');
    } else if (employee.email_verified && !employee.security_pin) {
      // Has verified email but no PIN: set up PIN
      setPinMode('setup');
      setShowPinModal(true);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!tempEmployee) return;

    // Check if email already exists for another employee
    const { data: existingEmail } = await supabase
      .from('employees')
      .select('id')
      .eq('email', email)
      .neq('id', tempEmployee.id)
      .maybeSingle();

    if (existingEmail) {
      setError('This email is already registered to another employee');
      return;
    }

    // Update employee with new email (unverified)
    const { error: updateError } = await supabase
      .from('employees')
      .update({ email, email_verified: false })
      .eq('id', tempEmployee.id);

    if (updateError) {
      setError('Failed to save email');
      return;
    }

    await sendVerificationCode({ ...tempEmployee, email });
    setStep('verify-email');
    setError('');
  };

  const sendVerificationCode = async (employee: Employee) => {
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await supabase
      .from('employees')
      .update({
        verification_code: code,
        verification_code_expires: expiresAt.toISOString()
      })
      .eq('id', employee.id);

    if (employee.email) {
      const emailResult = await sendVerificationEmail(employee.email, code, employee.name);
      if (!emailResult.success) {
        setError(emailResult.error || 'Failed to send email. Please try again.');
      }
    }
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

    // Mark email as verified
    const { error: updateError } = await supabase
      .from('employees')
      .update({
        email_verified: true,
        verification_code: null,
        verification_code_expires: null
      })
      .eq('id', tempEmployee.id);

    if (updateError) {
      setError('Failed to verify email');
      return;
    }

    setTempEmployee({ ...tempEmployee, email_verified: true });
    setError('');

    // Now set up PIN
    setPinMode('setup');
    setShowPinModal(true);
  };

  const handlePinSetup = async (pin: string) => {
    if (!tempEmployee) return;

    const { error } = await supabase
      .from('employees')
      .update({
        security_pin: pin,
        pin_set_at: getLocalDateTime()
      })
      .eq('id', tempEmployee.id);

    if (!error) {
      onSuccess({ ...tempEmployee, security_pin: pin, pin_set_at: getLocalDateTime() });
    } else {
      setError('Failed to set up PIN');
    }
  };

  const handlePinVerify = async (pin: string) => {
    if (!tempEmployee) return;

    if (pin === tempEmployee.security_pin) {
      onSuccess(tempEmployee);
    } else {
      alert('Incorrect PIN. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {step === 'name' && (
        <>
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
              placeholder="Enter your exact full name"
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
        </>
      )}

      {step === 'email-setup' && (
        <>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <p className="font-semibold text-gray-800">Welcome, {tempEmployee?.name}!</p>
            </div>
            <p className="text-sm text-gray-600">Let's set up your account. First, enter your email address.</p>
          </div>

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
              onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit()}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="your.email@example.com"
              autoFocus
            />
          </div>

          <button
            onClick={handleEmailSubmit}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Mail className="w-5 h-5" />
            Send Verification Code
          </button>
        </>
      )}

      {step === 'verify-email' && (
        <>
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-2">
              We've sent a 6-digit verification code to:
            </p>
            <p className="font-semibold text-gray-800">{email}</p>
          </div>

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

          <button
            onClick={handleVerifyCode}
            disabled={verificationCode.length !== 6}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-4 rounded-xl transition-colors"
          >
            Verify & Continue
          </button>

          <button
            onClick={() => tempEmployee && sendVerificationCode(tempEmployee)}
            className="w-full text-blue-600 hover:text-blue-700 font-semibold text-sm"
          >
            Resend Code
          </button>
        </>
      )}

      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmit={pinMode === 'setup' ? handlePinSetup : handlePinVerify}
        title={pinMode === 'setup' ? 'Set Up Your PIN' : 'Enter Your PIN'}
        isSetup={pinMode === 'setup'}
      />
    </div>
  );
}
