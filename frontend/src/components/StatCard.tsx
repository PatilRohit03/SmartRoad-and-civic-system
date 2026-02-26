import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

const variantClasses: Record<string, string> = {
  default: 'border-border',
  success: 'border-success/30',
  warning: 'border-warning/30',
  destructive: 'border-destructive/30',
};

const iconBg: Record<string, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

const StatCard = ({ title, value, icon, variant = 'default' }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={`glass-card p-5 flex items-center gap-4 ${variantClasses[variant]}`}
  >
    <div className={`p-3 rounded-lg ${iconBg[variant]}`}>{icon}</div>
    <div>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </motion.div>
);

export default StatCard;
