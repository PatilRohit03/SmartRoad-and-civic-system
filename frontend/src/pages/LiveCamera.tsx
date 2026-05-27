import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/api/api';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import { Menu, Camera, Wifi, WifiOff, ShieldCheck, AlertTriangle, Loader2, Smartphone, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LiveCamera = () => {
  const [webcamUrl, setWebcamUrl] = useState('');
  const [connected, setConnected] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const connectCamera = () => {
    let cleanUrl = webcamUrl.trim();
    
    if (!cleanUrl) {
      toast.error('Please enter the IP Webcam URL');
      return;
    }

    // Auto-fix common copy-paste errors from IP Webcam app
    if (cleanUrl.toLowerCase().startsWith('ipv4:')) {
      cleanUrl = cleanUrl.substring(5).trim();
    }
    if (cleanUrl.toLowerCase().startsWith('ipv6:')) {
      cleanUrl = cleanUrl.substring(5).trim();
    }
    
    // Ensure it starts with http:// or https://
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'http://' + cleanUrl;
    }

    setWebcamUrl(cleanUrl);
    setConnected(true);
    setAiResult(null);
    toast.success('📷 Connected to IP Webcam feed!');
  };

  const disconnectCamera = () => {
    setConnected(false);
    setAiResult(null);
  };

  const captureAndAnalyze = async () => {
    setCapturing(true);
    setAiResult(null);

    try {
      const res = await api.post('/webcam/capture', { webcam_url: webcamUrl });
      setAiResult(res.data);

      if (res.data.is_pothole) {
        toast.success(`✅ Pothole detected — Severity: ${res.data.severity}`);
      } else {
        toast.info('No pothole detected in this frame');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Capture failed. Check your IP Webcam connection.');
    } finally {
      setCapturing(false);
    }
  };

  const streamUrl = webcamUrl.replace(/\/$/, '') + '/video';

  return (
    <div className="min-h-screen pt-[var(--nav-height)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-64 p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-md hover:bg-secondary">
            <Menu size={20} />
          </button>
          <h1 className="text-2xl font-bold">Live Camera</h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Camera Feed */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Connection Form */}
            <div className="glass-card p-5 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Smartphone size={18} className="text-accent" />
                IP Webcam Connection
              </h2>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="http://192.168.1.5:8080"
                  value={webcamUrl}
                  onChange={(e) => setWebcamUrl(e.target.value)}
                  disabled={connected}
                  className="flex-1 px-3 py-2 rounded-md border bg-transparent text-sm"
                  id="webcam-url-input"
                />
                {!connected ? (
                  <button onClick={connectCamera}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    id="webcam-connect-btn">
                    <Wifi size={16} /> Connect
                  </button>
                ) : (
                  <button onClick={disconnectCamera}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
                    id="webcam-disconnect-btn">
                    <WifiOff size={16} /> Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* Video Feed */}
            <div className="glass-card overflow-hidden">
              {connected ? (
                <div className="relative">
                  <img
                    src={streamUrl}
                    alt="IP Webcam Live Feed"
                    className="w-full aspect-video object-cover"
                    onError={() => toast.error('Failed to load video stream. Check the URL.')}
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                </div>
              ) : (
                <div className="aspect-video flex flex-col items-center justify-center gap-3 text-muted-foreground bg-secondary/30">
                  <Camera size={48} className="opacity-30" />
                  <p className="text-sm">Enter your IP Webcam URL to start</p>
                </div>
              )}
            </div>

            {/* Capture Button */}
            {connected && (
              <motion.button
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                onClick={captureAndAnalyze} disabled={capturing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-accent text-accent-foreground font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                id="webcam-capture-btn"
              >
                {capturing ? (
                  <><Loader2 size={18} className="animate-spin" /> Analyzing...</>
                ) : (
                  <><Camera size={18} /> Capture & Analyze</>
                )}
              </motion.button>
            )}
          </motion.div>

          {/* Right: Results + Instructions */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }} className="space-y-4">

            {/* AI Results */}
            {aiResult && (
              <div className="glass-card p-5 space-y-4">
                <h2 className="font-semibold">AI Analysis Result</h2>

                <div className="flex items-center gap-3">
                  {aiResult.is_pothole ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <ShieldCheck size={20} />
                      <span className="font-medium">Pothole Detected!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertTriangle size={20} />
                      <span className="font-medium">No pothole found</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-muted-foreground text-xs">Severity</p>
                    <p className="font-semibold capitalize">{aiResult.severity}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <p className="text-muted-foreground text-xs">Detections</p>
                    <p className="font-semibold">{aiResult.total_detections}</p>
                  </div>
                </div>

                {/* Captured Image */}
                {aiResult.captured_image && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Captured Frame</p>
                    <img src={`http://127.0.0.1:8000/${aiResult.captured_image}`}
                      alt="Captured" className="rounded-md w-full max-h-48 object-cover" />
                  </div>
                )}

                {/* Heatmap */}
                {aiResult.heatmap && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">AI Heatmap</p>
                    <img src={`http://127.0.0.1:8000/${aiResult.heatmap}`}
                      alt="Heatmap" className="rounded-md w-full max-h-48 object-cover" />
                  </div>
                )}

                {/* Report Button */}
                {aiResult.is_pothole && (
                  <button onClick={() => navigate('/report')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                    id="webcam-report-btn">
                    Report This Pothole <ArrowRight size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Setup Instructions */}
            <div className="glass-card p-5 space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Smartphone size={18} className="text-accent" />
                How to Set Up IP Webcam
              </h2>
              <ol className="text-sm text-muted-foreground space-y-2.5 list-decimal list-inside">
                <li>Install <strong className="text-foreground">"IP Webcam"</strong> from the Google Play Store on your phone</li>
                <li>Open the app and scroll to the bottom</li>
                <li>Tap <strong className="text-foreground">"Start server"</strong></li>
                <li>Note the URL shown on your phone screen (e.g., <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">http://192.168.1.5:8080</code>)</li>
                <li>Make sure your <strong className="text-foreground">phone and PC are on the same WiFi</strong></li>
                <li>Paste the URL above and click <strong className="text-foreground">Connect</strong></li>
              </ol>

              <div className="mt-3 p-3 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent">
                💡 <strong>Tip:</strong> Point your phone camera at the road while driving or walking. Use "Capture & Analyze" whenever you spot a pothole!
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default LiveCamera;
