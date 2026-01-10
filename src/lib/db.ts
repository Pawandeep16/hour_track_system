import { firebaseDb } from './firebaseOperations';

export { db } from './firebase';
export { firebaseDb as supabase };
export type {
  Department,
  Task,
  Employee,
  TimeEntry,
  BreakEntry,
  Shift
} from './firebase';
