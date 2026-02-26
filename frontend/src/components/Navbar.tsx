import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import ThemeToggle from './ThemeToggle';
import { LogOut, Map, LayoutDashboard, Construction } from 'lucide-react';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[var(--nav-height)] border-b border-border bg-card/90 backdrop-blur-md">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <Construction size={22} className="text-accent" />
          <span>SmartRoad</span>
        </Link>

        <nav className="flex items-center gap-3">
          {isAuthenticated && (
            <>
              <Link
                to="/map"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm hover:bg-secondary transition-colors"
              >
                <Map size={16} />
                Map
              </Link>
              <Link
                to={user?.role === 'admin' ? '/admin' : '/dashboard'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm hover:bg-secondary transition-colors"
              >
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
            </>
          )}
          <ThemeToggle />
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
