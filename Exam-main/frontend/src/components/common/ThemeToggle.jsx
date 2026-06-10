import React, { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb">{theme === 'dark' ? '🌙' : '☀️'}</span>
      </span>
      <span className="theme-toggle-text">{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}
