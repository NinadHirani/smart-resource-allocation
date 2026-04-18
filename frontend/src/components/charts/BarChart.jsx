import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function BarChart({ labels, values, label }) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label,
            data: values,
            backgroundColor: '#f97316',
            borderRadius: 8,
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
