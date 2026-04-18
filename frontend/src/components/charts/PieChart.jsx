import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PieChart({ labels, values }) {
  return (
    <Pie
      data={{
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: ['#0f766e', '#f97316', '#dc2626', '#475569'],
          },
        ],
      }}
      options={{
        responsive: true,
      }}
    />
  );
}
