import { FC } from 'react';
import { Line } from 'react-chartjs-2';
import { months } from './constants';

interface Props {
  data: number[];
}

const LeftoverChart: FC<Props> = ({ data }) => (
  <Line
    data={{
      labels: months,
      datasets: [
        {
          label: 'Leftover',
          data,
          borderColor: 'rgb(56,132,255)',
          backgroundColor: 'rgba(56,132,255,0.2)',
        },
      ],
    }}
  />
);

export default LeftoverChart;
