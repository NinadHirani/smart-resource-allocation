export default function UrgencyBadge({ score }) {
  const numeric = Number(score);
  let tone = 'muted';

  if (numeric >= 8) tone = 'critical';
  else if (numeric >= 5) tone = 'warning';
  else if (numeric > 0) tone = 'calm';

  return <span className={`urgency-badge ${tone}`}>{numeric ? `${numeric}/10` : 'Score Pending'}</span>;
}
