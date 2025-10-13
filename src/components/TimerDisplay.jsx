import React from 'react';

const TimerDisplay = ({ time, mode, percentage }) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg className="absolute w-full h-full" viewBox="0 0 200 200">
        <circle
          className="text-gray-200 dark:text-gray-700"
          stroke="currentColor"
          strokeWidth="10"
          fill="transparent"
          r={radius}
          cx="100"
          cy="100"
        />
        <circle
          className="text-light-accent dark:text-dark-accent"
          stroke="currentColor"
          strokeWidth="10"
          fill="transparent"
          r={radius}
          cx="100"
          cy="100"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      <div className="relative z-10 text-center">
        <h1 className="text-7xl sm:text-8xl font-bold text-light-text dark:text-dark-text tabular-nums">
          {time}
        </h1>
        <p className="text-lg text-light-text-muted dark:text-dark-text-muted uppercase tracking-widest mt-2">
          {mode}
        </p>
      </div>
    </div>
  );
};

export default TimerDisplay;
