import { useState } from 'react';
import { supabase, Employee } from '../lib/supabase';
import { User, Mail, Briefcase, Save, X, CheckCircle, XCircle } from 'lucide-react';
import { getLocalDateTime } from '../lib/dateUtils';

interface AdminEmployeeEditorProps {
  employee: Employee;
  onClose: () => void;
  onUpdate: () => void;
}

const POSITIONS = [
  'Warehouse Associate',
  'Forklift Operator',
  'Warehouse Supervisor',
  'Inventory Specialist',
  'Shipping Clerk',
  'Receiving Clerk',
  'Quality Control',
  'Team Lead',
  'Warehouse Manager',
  'Other'
];

export default function AdminEmployeeEditor({ employee, onClose, onUpdate }: AdminEmployeeEditorProps) {
  const [name, setName] = useState(employee.name);
  const [email, setEmail] = useState(employee.email || '');
  const [position, setPosition] = useState(employee.position);
  const [isTemp, setIsTemp] = useState(employee.is_temp);
  const [emailVerified, setEmailVerified] = useState(employee.email_verified);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    if (email && !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    setError('');

    const { error: updateError } = await supabase
      .from('employees')
      .update({
        name: name.trim(),
        email: email.trim() || null,
        position,
        is_temp: isTemp,
        email_verified: emailVerified
      })
      .eq('id', employee.id);

    if (updateError) {
      setError('Failed to update employee');
      setIsSaving(false);
      return;
    }

    setSuccess('Employee updated successfully!');
    setIsSaving(false);

    setTimeout(() => {
      onUpdate();
      onClose();
    }, 1000);
  };

  const handleResetPin = async () => {
    if (!confirm('Are you sure you want to reset this employee\'s PIN? They will need to set a new one on their next login.')) {
      return;
    }

    const { error } = await supabase
      .from('employees')
      .update({
        security_pin: null,
        pin_set_at: null
      })
      .eq('id', employee.id);

    if (!error) {
      setSuccess('PIN reset successfully. Employee will set a new PIN on next login.');
    } else {
      setError('Failed to reset PIN');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Edit Employee</h2>
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
              placeholder="Enter employee full name"
            />
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="employee@example.com"
            />
            <div className="flex items-center gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailVerified}
                  onChange={(e) => setEmailVerified(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  {emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      Email Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-orange-700">
                      <XCircle className="w-4 h-4" />
                      Email Not Verified
                    </span>
                  )}
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Briefcase className="w-4 h-4 inline mr-2" />
              Position
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
            >
              {POSITIONS.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
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

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isTemp}
                onChange={(e) => setIsTemp(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-semibold text-gray-700">
                Temporary Employee
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleResetPin}
              className="w-full px-4 py-3 bg-orange-100 hover:bg-orange-200 text-orange-700 font-semibold rounded-xl transition-colors"
            >
              Reset Employee PIN
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Employee will need to set a new PIN on their next login
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
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
    </div>
  );
}
