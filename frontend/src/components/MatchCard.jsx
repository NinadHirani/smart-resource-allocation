export default function MatchCard({ match, selected, disabled, onToggle }) {
  return (
    <label className={`match-card${selected ? ' selected' : ''}`}>
      <input checked={selected} disabled={disabled} onChange={() => onToggle(match.volunteer.id)} type="checkbox" />
      <div>
        <div className="match-header">
          <strong>{match.volunteer.display_name}</strong>
          <span>{match.match_score}/100</span>
        </div>
        <p>{match.reason}</p>
        <small>{(match.volunteer.skills || []).join(', ') || 'No skills listed yet'}</small>
      </div>
    </label>
  );
}
