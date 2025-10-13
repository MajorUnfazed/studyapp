import React from 'react';
import { PlayIcon, PauseIcon, ArrowPathIcon, ForwardIcon } from '@heroicons/react/24/solid';

const Controls = ({ isRunning, onStart, onPause, onReset, onSkip }) => {
  const baseClasses = "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-white transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50";
  const primaryButton = `${baseClasses} bg-light-accent dark:bg-dark-accent hover:bg-light-accent-hover dark:hover:bg-dark-accent-hover focus:ring-light-accent dark:focus:ring-dark-accent`;
  const secondaryButton = `${baseClasses} bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 focus:ring-gray-400 dark:focus:ring-gray-600`;

  return (
    <div className="flex justify-center items-center space-x-4 sm:space-x-6">
      <button onClick={onReset} className={secondaryButton} title="Reset">
        <ArrowPathIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-700 dark:text-gray-300" />
      </button>
      
      {!isRunning ? (
        <button onClick={onStart} className={primaryButton} title="Start">
          <PlayIcon className="h-10 w-10 sm:h-12 sm:w-12" />
        </button>
      ) : (
        <button onClick={onPause} className={primaryButton} title="Pause">
          <PauseIcon className="h-10 w-10 sm:h-12 sm:w-12" />
        </button>
      )}

      <button onClick={onSkip} className={secondaryButton} title="Skip">
        <ForwardIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-700 dark:text-gray-300" />
      </button>
    </div>
  );
};

export default Controls;
