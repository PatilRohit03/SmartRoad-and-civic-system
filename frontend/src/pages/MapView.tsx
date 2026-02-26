import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import api from '@/api/api';
import { toast } from 'sonner';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import Sidebar from '@/components/Sidebar';
import { Menu } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Pothole {
  _id: string;
  status: string;
  latitude: number;
  longitude: number;
  description: string;
  frequency: number;
  createdAt: string;
}

const statusColor: Record<string, string> = {
  reported: '#ef4444',
  in_progress: '#f97316',
  resolved: '#22c55e',
  overdue: '#7f1d1d',
};

const MapView = () => {
  const [potholes, setPotholes] = useState<Pothole[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    api
      .get('/potholes')
      .then((res) => {
        setPotholes(res.data);
      })
      .catch(() => {
        toast.error('Failed to load pothole map data');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pt-[var(--nav-height)] bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:ml-64 p-6 h-[calc(100vh-var(--nav-height))]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-md hover:bg-secondary"
          >
            <Menu size={20} />
          </button>

          <h1 className="text-2xl font-bold">Pothole Map</h1>

          {/* Legend */}
          <div className="ml-auto flex items-center gap-4 text-xs">
            {Object.entries(statusColor).map(([status, color]) => (
              <span key={status} className="flex items-center gap-1.5 capitalize">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {status.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Map / Loading */}
        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : (
          <div className="h-[calc(100%-3rem)] rounded-lg overflow-hidden border border-border">
            <MapContainer
              center={[12.9716, 77.5946]} // Bangalore default
              zoom={12}
              className="h-full w-full"
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {potholes.map((p) => (
                <CircleMarker
                  key={p._id}
                  center={[p.latitude, p.longitude]}
                  radius={10}
                  pathOptions={{
                    color: statusColor[p.status] || '#ef4444',
                    fillColor: statusColor[p.status] || '#ef4444',
                    fillOpacity: 0.7,
                    weight: 2,
                    className:
                      p.status === 'reported' ? 'marker-pulse' : '',
                  }}
                >
                  <Popup>
                    <div className="text-sm space-y-1">
                      <p className="font-semibold capitalize">
                        Status: {p.status.replace('_', ' ')}
                      </p>

                      {p.description && (
                        <p className="text-muted-foreground">
                          {p.description}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Reports: {p.frequency}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}
      </main>
    </div>
  );
};

export default MapView;