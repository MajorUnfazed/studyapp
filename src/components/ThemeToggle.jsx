import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';

const ThemeToggle = () => {
  // DaisyUI theme pair: winter (light) / business (dark)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'winter');

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'business';
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'winter' ? 'business' : 'winter'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-ghost"
      title="Toggle theme"
      aria-label="Toggle theme"
    >
      {theme === 'business' ? (
        <MoonIcon className="h-6 w-6" />
      ) : (
        <SunIcon className="h-6 w-6" />
      )}
    </button>
  );
};

export default ThemeToggle;
