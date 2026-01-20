import { useState } from 'react';
import { firebaseDb } from '../lib/firebaseOperations';
import { TimeEntry, Task } from '../lib/firebase';
import { Clock, Save, X, Trash2 } from 'lucide-react';
import { calculateDurationMinutes } from '../lib/dateUtils';

interface TimeCardAdjustmentProps {
  entry: TimeEntry & { task: Task };
  onClose: () => void;
  onUpdate: () => void;
}

export default function TimeCardAdjustment({ entry, onClose, onUpdate }: TimeCardAdjustmentProps) {
  const [startTime, setStartTime] = useState(
    entry.start_time ? new Date(entry.start_time).toISOString().slice(0, 16) : ''
  );
  const [endTime, setEndTime] = useState(
    entry.end_time ? new Date(entry.end_time).toISOString().slice(0, 16) : ''
  );
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
      start_time: new Date(startTime).toISOString()
    };

    if (endTime) {
      updates.end_time = new Date(endTime).toISOString();
      updates.duration_minutes = calculateNewDuration();
    } else {
      updates.end_time = null;
      updates.duration_minutes = null;
    }

    const { error: updateError } = await firebaseDb
      .from('time_entries')
      .update(updates)
      .eq('id', entry.id);

    if (updateError) {
      setError('Failed to update timecard');
      setIsSaving(false);
      return;
    }

    setSuccess('Timecard updated successfully!');
    setIsSaving(false);

    setTimeout(() => {
      onUpdate();
      onClose();
    }, 1000);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this time entry? This action cannot be undone.')) {
      return;
    }

    const { error: deleteError } = await firebaseDb
      .from('time_entries')
      .delete()
      .eq('id', entry.id);

    if (deleteError) {
      setError('Failed to delete timecard');
      return;
    }

    setSuccess('Timecard deleted successfully!');
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
            <h2 className="text-2xl font-bold text-gray-800">Adjust Time Card</h2>
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
            <p className="text-sm text-gray-600 mb-1">Task</p>
            <p className="font-semibold text-gray-800">{entry.task.name}</p>
            <p className="text-xs text-gray-500 mt-1">Entry Date: {entry.entry_date}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
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
              <Clock className="w-4 h-4 inline mr-2" />
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
            <p className="text-xs text-gray-500 mt-1">Leave empty if task is still in progress</p>
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
