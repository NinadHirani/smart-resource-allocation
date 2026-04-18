export const NEED_CATEGORIES = [
  'Food',
  'Medical',
  'Education',
  'Shelter',
  'Water',
  'Sanitation',
  'Employment',
  'Other',
];

export const TASK_SKILLS = [
  'First Aid',
  'Teaching',
  'Driving',
  'Counseling',
  'Construction',
  'Cooking',
  'Data Entry',
  'Communication',
  'Medical',
  'Other',
];

export const AVAILABILITY_SLOTS = [
  'Weekday Mornings',
  'Weekday Afternoons',
  'Weekday Evenings',
  'Weekends',
];

export const REPORT_STATUSES = ['pending_review', 'reviewed', 'task_created', 'resolved'];
export const TASK_STATUSES = ['open', 'in_progress', 'completed', 'cancelled'];

export function formatStatusLabel(value) {
  return String(value || '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
