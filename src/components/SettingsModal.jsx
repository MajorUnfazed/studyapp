import React from 'react';
import { Cog8ToothIcon } from '@heroicons/react/24/outline';

const SettingsModal = ({
  isOpen,
  onClose,
  workInput, setWorkInput,
  breakInput, setBreakInput,
  longBreakInput, setLongBreakInput,
  cyclesInput, setCyclesInput,
  onApply,
  isRunning,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-light-surface dark:bg-dark-surface rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-text">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <Cog8ToothIcon className="h-6 w-6 text-light-text-muted dark:text-dark-text-muted" />
          </button>
        </div>

        <fieldset disabled={isRunning} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-light-text-muted dark:text-dark-text-muted">Work</span>
              <input type="number" min={1} value={workInput} onChange={e => setWorkInput(e.target.value)} className="form-input mt-1 block w-full rounded-lg border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:ring-light-accent dark:focus:ring-dark-accent focus:border-light-accent dark:focus:border-dark-accent" />
            </label>
            <label className="block">
              <span className="text-light-text-muted dark:text-dark-text-muted">Break</span>
              <input type="number" min={1} value={breakInput} onChange={e => setBreakInput(e.target.value)} className="form-input mt-1 block w-full rounded-lg border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:ring-light-accent dark:focus:ring-dark-accent focus:border-light-accent dark:focus:border-dark-accent" />
            </label>
            <label className="block">
              <span className="text-light-text-muted dark:text-dark-text-muted">Long Break</span>
              <input type="number" min={1} value={longBreakInput} onChange={e => setLongBreakInput(e.target.value)} className="form-input mt-1 block w-full rounded-lg border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:ring-light-accent dark:focus:ring-dark-accent focus:border-light-accent dark:focus:border-dark-accent" />
            </label>
            <label className="block">
              <span className="text-light-text-muted dark:text-dark-text-muted">Cycles</span>
              <input type="number" min={2} value={cyclesInput} onChange={e => setCyclesInput(e.target.value)} className="form-input mt-1 block w-full rounded-lg border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg focus:ring-light-accent dark:focus:ring-dark-accent focus:border-light-accent dark:focus:border-dark-accent" />
            </label>
          </div>
          {isRunning && <p className="text-sm text-light-text-muted dark:text-dark-text-muted">Settings are disabled while the timer is running.</p>}
        </fieldset>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onApply}
            disabled={isRunning}
            className="px-6 py-2.5 bg-light-accent dark:bg-dark-accent text-white font-semibold rounded-lg shadow-md hover:bg-light-accent-hover dark:hover:bg-dark-accent-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
