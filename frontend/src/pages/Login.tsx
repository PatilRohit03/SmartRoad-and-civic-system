import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/api/api';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ FastAPI FormData
      const formData = new FormData();
      formData.append('username', email); // backend uses email as username
      formData.append('password', password);

      const res = await api.post('/login', formData);

      const { access_token, role } = res.data;

      // ✅ Save token for axios interceptor
      localStorage.setItem('smartroad_token', access_token);

      // ✅ Minimal user object for store
      setAuth(
        { email, role },
        access_token
      );

      toast.success('Welcome back!');
      navigate(role === 'admin' ? '/admin' : '/dashboard');

    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-[var(--nav-height)]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card p-8"
      >
        <div className="flex items-center gap-2 mb-6">
          <LogIn size={22} className="text-accent" />
          <h2 className="text-xl font-bold">Sign In</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-sm text-muted-foreground mt-4 text-center">
          No account?{' '}
          <Link to="/register" className="text-accent hover:underline">
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;