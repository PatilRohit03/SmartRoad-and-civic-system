import { useEffect } from 'react';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRouter from '@/router/AppRouter';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

const queryClient = new QueryClient();

const App = () => {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const initTheme = useThemeStore((s) => s.init);

  useEffect(() => {
    loadFromStorage();
    initTheme();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
