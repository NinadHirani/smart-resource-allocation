import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function LineChart({ labels, values, label }) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label,
            data: values,
            borderColor: '#0f766e',
            backgroundColor: 'rgba(15, 118, 110, 0.15)',
            fill: true,
            tension: 0.35,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { display: false },
        },
      }}
    />
  );
}
