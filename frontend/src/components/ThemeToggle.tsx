import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { motion } from 'framer-motion';

const ThemeToggle = () => {
  const { isDark, toggle } = useThemeStore();

  return (
    <button
      onClick={toggle}
      className="relative p-2 rounded-md border border-border bg-secondary hover:bg-muted transition-colors"
      aria-label="Toggle theme"
    >
      <motion.div
        key={isDark ? 'dark' : 'light'}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </motion.div>
    </button>
  );
};

export default ThemeToggle;
