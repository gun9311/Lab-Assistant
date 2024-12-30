import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

// 필요한 요소와 플러그인 등록
ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutChartProps {
  submittedCount: number;
  totalStudents: number;
}

const DonutChartComponent: React.FC<DonutChartProps> = ({
  submittedCount,
  totalStudents,
}) => {
  const data = {
    labels: ["Submitted", "Not Submitted"],
    datasets: [
      {
        data: [submittedCount, totalStudents - submittedCount],
        backgroundColor: ["#4caf50", "#e0e0e0"],
        hoverBackgroundColor: ["#66bb6a", "#f5f5f5"],
      },
    ],
  };

  const options = {
    cutout: "70%", // 도넛의 두께 조정
    plugins: {
      legend: {
        display: false, // 범례 숨기기
      },
    },
  };

  return <Doughnut data={data} options={options} />;
};

export default DonutChartComponent;
