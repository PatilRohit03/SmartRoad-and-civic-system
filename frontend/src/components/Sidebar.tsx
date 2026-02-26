import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Map, LayoutDashboard, FileText, PlusCircle, X } from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar = ({ open, onClose }: SidebarProps) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const links = [
    { to: isAdmin ? '/admin' : '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/map', label: 'Map View', icon: Map },
    ...(!isAdmin ? [{ to: '/report', label: 'Report Issue', icon: PlusCircle }] : []),
  ];

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-foreground/20 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed top-[var(--nav-height)] left-0 bottom-0 z-40 w-64 bg-sidebar border-r border-sidebar-border p-4 transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button onClick={onClose} className="lg:hidden absolute top-3 right-3 text-sidebar-foreground">
          <X size={20} />
        </button>
        <nav className="mt-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`
              }
            >
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
