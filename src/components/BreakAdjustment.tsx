import { useState } from 'react';
import { supabase, BreakEntry } from '../lib/supabase';
import { Coffee, Save, X, Trash2 } from 'lucide-react';
import { calculateDurationMinutes } from '../lib/dateUtils';

interface BreakAdjustmentProps {
  breakEntry: BreakEntry;
  employeeName: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function BreakAdjustment({ breakEntry, employeeName, onClose, onUpdate }: BreakAdjustmentProps) {
  const [startTime, setStartTime] = useState(
    breakEntry.start_time ? new Date(breakEntry.start_time).toISOString().slice(0, 16) : ''
  );
  const [endTime, setEndTime] = useState(
    breakEntry.end_time ? new Date(breakEntry.end_time).toISOString().slice(0, 16) : ''
  );
  const [breakType, setBreakType] = useState<'paid' | 'unpaid'>(breakEntry.break_type);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const calculateNewDuration = () => {
    if (!startTime || !endTime) return 0;
    return calculateDurationMinutes(
      new Date(startTime).toISOString(),
      new Date(endTime).toISOString()
    );
  };

  const handleSave = async () => {
    if (!startTime) {
      setError('Start time is required');
      return;
    }

    if (endTime && new Date(endTime) <= new Date(startTime)) {
      setError('End time must be after start time');
      return;
    }

    setIsSaving(true);
    setError('');

    const updates: any = {
      start_time: new Date(startTime).toISOString(),
      break_type: breakType
    };

    if (endTime) {
      updates.end_time = new Date(endTime).toISOString();
      updates.duration_minutes = calculateNewDuration();
    } else {
      updates.end_time = null;
      updates.duration_minutes = null;
    }

    const { error: updateError } = await supabase
      .from('break_entries')
      .update(updates)
      .eq('id', breakEntry.id);

    if (updateError) {
      setError('Failed to update break entry');
      setIsSaving(false);
      return;
    }

    setSuccess('Break entry updated successfully!');
    setIsSaving(false);

    setTimeout(() => {
      onUpdate();
      onClose();
    }, 1000);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this break entry? This action cannot be undone.')) {
      return;
    }

    const { error: deleteError } = await supabase
      .from('break_entries')
      .delete()
      .eq('id', breakEntry.id);

    if (deleteError) {
      setError('Failed to delete break entry');
      return;
    }

    setSuccess('Break entry deleted successfully!');
    setTimeout(() => {
      onUpdate();
      onClose();
    }, 1000);
  };

  const newDuration = calculateNewDuration();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Adjust Break Entry</h2>
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

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Employee</p>
            <p className="font-semibold text-gray-800">{employeeName}</p>
            <p className="text-xs text-gray-500 mt-1">Break Date: {breakEntry.entry_date}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Coffee className="w-4 h-4 inline mr-2" />
              Break Type
            </label>
            <select
              value={breakType}
              onChange={(e) => setBreakType(e.target.value as 'paid' | 'unpaid')}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
            >
              <option value="paid">Paid Break (15 min)</option>
              <option value="unpaid">Unpaid Break (30 min)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              End Time
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty if break is still in progress</p>
          </div>

          {startTime && endTime && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">New Duration</p>
              <p className="text-2xl font-bold text-blue-700">
                {Math.floor(newDuration / 60)}h {newDuration % 60}m
              </p>
            </div>
          )}

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
              onClick={handleDelete}
              className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
