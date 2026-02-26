import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, AlertTriangle } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      '404 Error: User attempted to access non-existent route:',
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-10 max-w-md text-center"
      >
        <div className="flex justify-center mb-4 text-destructive">
          <AlertTriangle size={36} />
        </div>

        <h1 className="text-4xl font-bold mb-2">404</h1>

        <p className="text-muted-foreground mb-6">
          The page you’re looking for doesn’t exist or was moved.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          <Home size={18} />
          Return to Home
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;