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
  Upload,
  Save,
  ShieldCheck,
  Brain,
} from 'lucide-react';

interface Pothole {
  _id: string;
  latitude: number;
  longitude: number;
  description: string;
  status: string;
  frequency: number;
  createdAt: string;

  // 🧠 AI
  ai_verified?: boolean;
  ai_severity?: 'low' | 'medium' | 'dangerous';
  ai_detections?: any[];

  // 🖼 MEDIA
  image_path?: string;
  proof_image?: string;
}

const statuses = [
  'reported',
  'in_progress',
  'resolved',
  'overdue',
  'false_positive'
];

const statusBadge: Record<string, string> = {
  reported: 'status-reported',
  in_progress: 'status-in-progress',
  resolved: 'status-resolved',
  overdue: 'status-overdue',
  false_positive: 'bg-red-100 text-red-700'
};

const severityBadge: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  dangerous: 'bg-red-100 text-red-700',
};

const AdminDashboard = () => {
  const [potholes, setPotholes] = useState<Pothole[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNote, setEditNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const fetchPotholes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/potholes');
      setPotholes(res.data);
    } catch {
      toast.error('Failed to load potholes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPotholes();
  }, []);

  const startEdit = (p: Pothole) => {
    setEditingId(p._id);
    setEditStatus(p.status);
    setEditNote('');
    setProofFile(null);
  };

  const handleUpdate = async (id: string) => {
    try {
      const formData = new FormData();
      formData.append('status', editStatus);
      if (editNote) formData.append('admin_note', editNote);

      await api.put(`/pothole/${id}`, formData);

      if (proofFile) {
        const proofData = new FormData();
        proofData.append('file', proofFile);
        await api.put(`/pothole/${id}/proof`, proofData);
      }

      toast.success('Pothole updated');
      setEditingId(null);
      fetchPotholes();
    } catch {
      toast.error('Update failed');
    }
  };

  const counts = {
    total: potholes.length,
    reported: potholes.filter(p => p.status === 'reported').length,
    inProgress: potholes.filter(p => p.status === 'in_progress').length,
    resolved: potholes.filter(p => p.status === 'resolved').length,
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
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total" value={counts.total} icon={<FileWarning size={20} />} />
          <StatCard title="Reported" value={counts.reported} icon={<AlertTriangle size={20} />} variant="destructive" />
          <StatCard title="In Progress" value={counts.inProgress} icon={<Clock size={20} />} variant="warning" />
          <StatCard title="Resolved" value={counts.resolved} icon={<CheckCircle size={20} />} variant="success" />
        </div>

        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : (
          <div className="overflow-x-auto glass-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-4">Coordinates</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Media</th> {/* 🖼 */}
                  <th className="p-4">AI</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {potholes.map((p, i) => (
                  <motion.tr
                    key={p._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border last:border-0"
                  >
                    <td className="p-4 font-medium">
                      {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                    </td>

                    <td className="p-4 text-muted-foreground max-w-xs truncate">
                      {p.description || '—'}
                    </td>

                    {/* 🖼 MEDIA COLUMN */}
                    <td className="p-4 space-y-2">
                      {p.image_path && (
                        <img
                          src={`http://127.0.0.1:8000/${p.image_path}`}
                          alt="User upload"
                          className="rounded-md max-h-24 object-cover border"
                        />
                      )}

                      {p.proof_image && (
                        <img
                          src={`http://127.0.0.1:8000/${p.proof_image}`}
                          alt="Admin proof"
                          className="rounded-md max-h-24 object-cover border"
                        />
                      )}
                    </td>

                    {/* AI COLUMN */}
                    <td className="p-4 text-xs space-y-1">
                      {p.ai_verified ? (
                        <>
                          <div className="flex items-center gap-1 text-green-600">
                            <ShieldCheck size={12} /> Verified
                          </div>
                          {p.ai_severity && (
                            <span className={`px-2 py-0.5 rounded-full ${severityBadge[p.ai_severity]}`}>
                              {p.ai_severity}
                            </span>
                          )}
                          {p.ai_detections && (
                            <div className="text-muted-foreground">
                              Detections: {p.ai_detections.length}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Not verified</span>
                      )}
                    </td>

                    <td className="p-4">
                      {editingId === p._id ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="px-2 py-1 rounded border"
                        >
                          {statuses.map(s => (
                            <option key={s} value={s}>
                              {s.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-xs px-2.5 py-1 rounded-full ${statusBadge[p.status]}`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      {editingId === p._id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="Admin note"
                            rows={2}
                            className="w-full px-2 py-1 rounded border text-sm"
                          />

                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <Upload size={14} />
                            {proofFile ? proofFile.name : 'Upload proof'}
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                            />
                          </label>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(p._id)}
                              className="px-3 py-1 bg-accent rounded text-xs flex items-center gap-1"
                            >
                              <Save size={12} /> Save
                            </button>

                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 border rounded text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(p)}
                          className="px-3 py-1 border rounded text-xs"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;