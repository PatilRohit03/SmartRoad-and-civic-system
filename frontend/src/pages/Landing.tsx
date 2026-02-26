import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Shield, BarChart3, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const features = [
  {
    icon: MapPin,
    title: 'Report Potholes',
    desc: 'Pin exact locations on an interactive map. Help your city prioritize road repairs.',
  },
  {
    icon: BarChart3,
    title: 'Track Progress',
    desc: 'Real-time status updates from reported to resolved. Full transparency.',
  },
  {
    icon: Shield,
    title: 'Government Verified',
    desc: 'Admin-verified repairs with photographic proof and official notes.',
  },
];

const Landing = () => {
  const { user } = useAuthStore();
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 pt-[var(--nav-height)]">
        <div className="max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-3 py-1 mb-6 text-xs font-medium rounded-full bg-accent/10 text-accent border border-accent/20">
              Civic Infrastructure Platform
            </span>

            <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
              Better Roads Start With{' '}
              <span className="text-accent">Better Data</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              SmartRoad empowers citizens to report road damage and enables governments
              to respond faster with verified, location-based infrastructure data.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              {isLoggedIn ? (
                <Link
                  to={user.role === 'admin' ? '/admin' : '/dashboard'}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                  Go to Dashboard
                  <ArrowRight size={18} />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                  >
                    Get Started
                    <ArrowRight size={18} />
                  </Link>

                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border bg-card text-foreground font-medium hover:bg-secondary transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-20 grid md:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 * i }}
            className="glass-card p-6 hover:border-accent/30 transition-colors"
          >
            <div className="p-2.5 rounded-lg bg-accent/10 text-accent w-fit mb-4">
              <f.icon size={22} />
            </div>
            <h3 className="font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </section>
    </div>
  );
};

export default Landing;