import React from 'react';
import './App.css';
import data from './data';

const Chart = ({ children, height, width }) => (
  <svg viewBox={`0 0 ${width} ${height}`} height={height} width={width}>
    {children}
  </svg>
);

const Bar = ({ fill = "#000000", x, y, height, width }) => (
  <rect fill={fill} x={x} y={y} height={height} width={width} />
);

const greatestValue = values => values.reduce((acc, cur) => (cur > acc ? cur : acc), -Infinity);

const BarChart = ({ data }) => {
  const barWidth = 30;
  const barMargin = 5;
  const width = data.length * (barWidth + barMargin);
  const height = greatestValue(data.map(({ dollars_spent }) => dollars_spent));

  return (
    <Chart height={height} width={width}>
      {data.map(({ dollars_spent, id }, index) => (
        <g class="bar">
          <Bar
            key={id}
            fill="#356635"
            x={index * (barWidth + barMargin)}
            y={height - dollars_spent}
            width={barWidth}
            height={dollars_spent}
          />
          <text
            x={index * (barWidth + barMargin)}
            y="495"
            dx="5"
          >
            {dollars_spent}
          </text>
        </g>
      ))}
    </Chart>
  );
}

function App() {
  return (
    <BarChart data={data} />
  );
}

export default App;
