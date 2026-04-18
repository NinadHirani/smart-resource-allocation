import { Link } from 'react-router-dom';
import { formatStatusLabel } from '../lib/constants';

export default function TaskCard({ task, href }) {
  return (
    <article className="task-card">
      <div className="task-card-header">
        <div>
          <span className="eyebrow">{task.category}</span>
          <h3>{task.title}</h3>
        </div>
        <span className={`status-pill status-${task.status}`}>{formatStatusLabel(task.status)}</span>
      </div>
      <p>{task.description}</p>
      <div className="task-meta">
        <span>{task.location}</span>
        <span>Deadline: {task.deadline || 'Open-ended'}</span>
        <span>
          Assigned: {task.volunteers_assigned || 0}/{task.volunteer_count_needed || 1}
        </span>
      </div>
      {href ? (
        <Link className="ghost-button" to={href}>
          View Task
        </Link>
      ) : null}
    </article>
  );
}
