import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/api/api';
import { toast } from 'sonner';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import StatCard from '@/components/StatCard';
import Sidebar from '@/components/Sidebar';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileWarning,
  Menu,
  ShieldCheck,
  Brain,
} from 'lucide-react';

interface Pothole {
  _id: string;
  status: string;
  description: string;
  latitude: number;
  longitude: number;
  frequency: number;
  createdAt: string;

  // Images
  image_path?: string;   // user uploaded image
  proof_image?: string;  // admin proof image

  // 🤖 AI fields
  ai_verified?: boolean;
  ai_severity?: 'low' | 'medium' | 'dangerous';
  ai_detections?: any[];
}

const statusBadge: Record<string, string> = {
  reported: 'status-reported',
  in_progress: 'status-in-progress',
  resolved: 'status-resolved',
  overdue: 'status-overdue',
};

const severityBadge: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  dangerous: 'bg-red-100 text-red-700',
};

const UserDashboard = () => {
  const [potholes, setPotholes] = useState<Pothole[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchReports = () => {
    setLoading(true);
    api
      .get('/my-reports')
      .then((res) => setPotholes(res.data))
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const counts = {
    total: potholes.length,
    reported: potholes.filter((p) => p.status === 'reported').length,
    inProgress: potholes.filter((p) => p.status === 'in_progress').length,
    resolved: potholes.filter((p) => p.status === 'resolved').length,

    // 🤖 AI stats
    aiVerified: potholes.filter((p) => p.ai_verified).length,
    dangerous: potholes.filter((p) => p.ai_severity === 'dangerous').length,
  };

  return (
    <div className="min-h-screen pt-[var(--nav-height)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-64 p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md hover:bg-secondary"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-2xl font-bold">My Reports</h1>
        </div>

        {/* 📊 STATS */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <StatCard title="Total Reports" value={counts.total} icon={<FileWarning size={20} />} />
          <StatCard title="Reported" value={counts.reported} icon={<AlertTriangle size={20} />} variant="destructive" />
          <StatCard title="In Progress" value={counts.inProgress} icon={<Clock size={20} />} variant="warning" />
          <StatCard title="Resolved" value={counts.resolved} icon={<CheckCircle size={20} />} variant="success" />
          <StatCard title="AI Verified" value={counts.aiVerified} icon={<ShieldCheck size={20} />} />
          <StatCard title="Dangerous" value={counts.dangerous} icon={<Brain size={20} />} variant="destructive" />
        </div>

        {/* 📄 REPORTS */}
        {loading ? (
          <LoadingSkeleton rows={4} />
        ) : potholes.length === 0 ? (
          <div className="glass-card p-10 text-center text-muted-foreground">
            No reports yet. Start by reporting a pothole!
          </div>
        ) : (
          <div className="space-y-3">
            {potholes.map((p, i) => (
              <motion.div
                key={p._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 space-y-3"
              >
                {/* HEADER */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      📍 {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {p.description || 'Awaiting admin update'}
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      statusBadge[p.status] || ''
                    }`}
                  >
                    {p.status.replace('_', ' ')}
                  </span>
                </div>

                {/* 🤖 AI STATUS */}
                <div className="flex flex-wrap gap-3 text-sm">
                  {p.ai_verified ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <ShieldCheck size={14} /> AI Verified
                    </span>
                  ) : (
                    <span className="text-gray-500 text-xs">Not AI Verified</span>
                  )}

                  {p.ai_severity && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        severityBadge[p.ai_severity]
                      }`}
                    >
                      Severity: {p.ai_severity}
                    </span>
                  )}

                  {p.ai_detections && (
                    <span className="text-muted-foreground text-xs">
                      Detections: {p.ai_detections.length}
                    </span>
                  )}
                </div>

                {/* 📷 USER UPLOADED IMAGE */}
                {p.image_path && (
                  <img
                    src={`http://127.0.0.1:8000/${p.image_path}`}
                    alt="Reported"
                    className="rounded-md max-h-40 object-cover"
                  />
                )}

                {/* ✅ ADMIN PROOF IMAGE */}
                {p.proof_image && (
                  <img
                    src={`http://127.0.0.1:8000/${p.proof_image}`}
                    alt="Proof"
                    className="rounded-md max-h-40 object-cover border"
                  />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default UserDashboard;