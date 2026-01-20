import { Shift } from './firebase';

export const detectShift = (startTime: string, shifts: Shift[]): Shift | null => {
  if (!shifts || shifts.length === 0) return null;

  const time = new Date(startTime);
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  for (const shift of shifts) {
    const [startHour, startMin] = shift.start_time.split(':').map(Number);
    const [endHour, endMin] = shift.end_time.split(':').map(Number);

    const shiftStart = startHour * 60 + startMin;
    const shiftEnd = endHour * 60 + endMin;

    if (shiftStart < shiftEnd) {
      if (timeInMinutes >= shiftStart && timeInMinutes < shiftEnd) {
        return shift;
      }
    } else {
      if (timeInMinutes >= shiftStart || timeInMinutes < shiftEnd) {
        return shift;
      }
    }
  }

  return shifts[0];
};
