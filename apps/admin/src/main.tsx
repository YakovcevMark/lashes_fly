import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, Typography } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { copy } from '@assets/constants';
import { PanelShell } from '@components/panel-shell';
import { consumeLoginCallback } from '@api/login-callback';
import { router } from './app/router';
import { theme } from './app/theme';

const callback = consumeLoginCallback();
const client = new QueryClient();

function App() {
  const [pending, setPending] = useState(Boolean(callback));
  useEffect(() => {
    if (callback)
      void callback.then(async (result) => {
        await router.navigate(result.path, { replace: true, state: { error: result.error } });
        setPending(false);
      });
  }, []);
  return pending ? (
    <PanelShell>
      <Typography role="status">{copy.verifying}</Typography>
    </PanelShell>
  ) : (
    <RouterProvider router={router} />
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>
  </ThemeProvider>
);
