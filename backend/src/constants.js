const NEED_CATEGORIES = [
  'Food',
  'Medical',
  'Education',
  'Shelter',
  'Water',
  'Sanitation',
  'Employment',
  'Other',
];

const TASK_SKILLS = [
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

const AVAILABILITY_SLOTS = [
  'Weekday Mornings',
  'Weekday Afternoons',
  'Weekday Evenings',
  'Weekends',
];

const NEED_STATUSES = ['pending_review', 'reviewed', 'task_created', 'resolved'];
const TASK_STATUSES = ['open', 'in_progress', 'completed', 'cancelled'];

module.exports = {
  AVAILABILITY_SLOTS,
  NEED_CATEGORIES,
  NEED_STATUSES,
  TASK_SKILLS,
  TASK_STATUSES,
};
