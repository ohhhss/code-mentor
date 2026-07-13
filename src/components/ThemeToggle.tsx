import { useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeMode } from '@/types/theme';

interface ThemeToggleProps {
  className?: string;
  style?: React.CSSProperties;
  containerId?: string;
}

const themeOrder: ThemeMode[] = ['system', 'light', 'dark'];

const themeLabels: Record<ThemeMode, string> = {
  light: '浅色模式',
  dark: '深色模式',
  system: '跟随系统',
};

export function ThemeToggle({ className, style, containerId }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  const renderIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun size={20} />;
      case 'dark':
        return <Moon size={20} />;
      case 'system':
        return <Monitor size={20} />;
    }
  };

  return (
    <div
      id={containerId}
      className={`theme-toggle-container ${className || ''}`}
      style={style}
    >
      <button
        className="theme-toggle-btn"
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={themeLabels[theme]}
        title={themeLabels[theme]}
      >
        {renderIcon()}
      </button>
      {showTooltip && (
        <div className="theme-toggle-tooltip">
          {themeLabels[theme]}
          <div className="theme-toggle-tooltip-arrow" />
        </div>
      )}
    </div>
  );
}
