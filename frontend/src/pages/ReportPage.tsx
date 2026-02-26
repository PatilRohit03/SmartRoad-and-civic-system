import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '@/api/api';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { Menu, Send, ShieldCheck, AlertTriangle, Video, Image } from 'lucide-react';

const ReportPage = () => {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  const [aiResult, setAiResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // ==========================
  // AI VALIDATION
  // ==========================
  const validateWithAI = async (uploadedFile: File) => {
    setValidating(true);
    setAiResult(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const endpoint =
        mediaType === 'image'
          ? '/ai/validate-image'
          : '/ai/validate-video';

      const res = await api.post(endpoint, formData);
      setAiResult(res.data);

      if (!res.data.is_pothole) {
        toast.error('❌ AI did not detect a pothole');
      } else {
        toast.success(`✅ AI Verified — Severity: ${res.data.severity}`);
      }
    } catch {
      toast.error('AI validation failed');
    } finally {
      setValidating(false);
    }
  };

  // ==========================
  // FINAL SUBMIT
  // ==========================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !aiResult?.is_pothole) {
      toast.error('AI verification required');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('severity', aiResult.severity);

      await api.post('/report', formData);

      toast.success('🚧 Pothole reported successfully');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="text-2xl font-bold">Report a Pothole</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg glass-card p-6 space-y-4"
        >

          {/* MEDIA TYPE SWITCH */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMediaType('image');
                setAiResult(null);
                setFile(null);
              }}
              className={`flex items-center gap-1 px-3 py-1 rounded-md border ${
                mediaType === 'image' ? 'bg-primary text-white' : ''
              }`}
            >
              <Image size={16} /> Image
            </button>

            <button
              type="button"
              onClick={() => {
                setMediaType('video');
                setAiResult(null);
                setFile(null);
              }}
              className={`flex items-center gap-1 px-3 py-1 rounded-md border ${
                mediaType === 'video' ? 'bg-primary text-white' : ''
              }`}
            >
              <Video size={16} /> Video
            </button>
          </div>

          {/* FILE UPLOAD */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Upload {mediaType === 'image' ? 'Image' : 'Video'}
            </label>
            <input
              type="file"
              accept={mediaType === 'image' ? 'image/*' : 'video/mp4'}
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFile(f || null);
                if (f) validateWithAI(f);
              }}
            />
          </div>

          {/* AI STATUS */}
          {validating && (
            <p className="text-sm text-muted-foreground">
              🔍 AI validating {mediaType}…
            </p>
          )}

          {aiResult && (
            <div className="p-3 rounded-md border text-sm space-y-2">
              {aiResult.is_pothole ? (
                <div className="flex items-center gap-2 text-green-600">
                  <ShieldCheck size={16} /> Verified pothole
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle size={16} /> Not a pothole
                </div>
              )}

              <p>Severity: <b>{aiResult.severity}</b></p>

              {aiResult.frames_checked && (
                <p>Frames analyzed: {aiResult.frames_checked}</p>
              )}

              {mediaType === 'image' && aiResult.heatmap && (
                <img
                  src={`http://127.0.0.1:8000/${aiResult.heatmap}`}
                  alt="Heatmap"
                  className="rounded-md mt-2"
                />
              )}
            </div>
          )}

          {/* LOCATION */}
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Latitude"
              type="number"
              step="any"
              required
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="px-3 py-2 rounded-md border"
            />
            <input
              placeholder="Longitude"
              type="number"
              step="any"
              required
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="px-3 py-2 rounded-md border"
            />
          </div>

          {/* SUBMIT */}
          <button
            onClick={handleSubmit}
            disabled={!aiResult?.is_pothole || submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            <Send size={16} />
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </motion.div>
      </main>
    </div>
  );
};

export default ReportPage;