import { Alert, Button, Divider, Paper, Stack, Typography } from '@mui/material';
import { Navigate, useLocation } from 'react-router';
import { copy } from '@assets/constants';
import { hasApi, responseStatus } from '@api/session-api';
import { useLogout, useMasterSession } from '@api/api-hooks/session';

export function CabinetPage() {
  const { pathname } = useLocation();
  const { token, query } = useMasterSession();
  const logout = useLogout();
  if (!hasApi || !token || responseStatus(query.error) === 401) {
    return <Navigate replace to="/login" state={{ returnPath: pathname }} />;
  }
  if (query.isError)
    return (
      <>
        <Alert severity="error">{copy.unavailable}</Alert>
        <Button onClick={() => void query.refetch()} disabled={query.isFetching}>
          {copy.retry}
        </Button>
      </>
    );
  if (!query.data) return <Typography role="status">{copy.loading}</Typography>;
  return (
    <>
      <Typography component="h1" variant="h1">
        {copy.cabinet}
      </Typography>
      <Paper variant="outlined" sx={{ p: { xs: 5, sm: 7 } }}>
        <Stack spacing={4}>
          <Typography component="h2" variant="h6">
            {copy.session}
          </Typography>
          <Divider />
          <Stack component="dl" spacing={2} sx={{ m: 0 }}>
            <Typography component="dt" color="text.secondary">
              {copy.telegramId}
            </Typography>
            <Typography component="dd" sx={{ m: 0 }}>
              {query.data.telegramId}
            </Typography>
            <Typography component="dt" color="text.secondary">
              {copy.expires}
            </Typography>
            <Typography component="dd" sx={{ m: 0 }}>
              {new Intl.DateTimeFormat('ru-RU', {
                dateStyle: 'long',
                timeStyle: 'short',
                timeZone: 'Europe/Minsk',
              }).format(new Date(query.data.expiresAt))}{' '}
              (Минск)
            </Typography>
          </Stack>
        </Stack>
      </Paper>
      {logout.isError && <Alert severity="error">{copy.logoutFailed}</Alert>}
      <Button variant="outlined" disabled={logout.isPending} onClick={() => logout.mutate()}>
        {logout.isPending ? copy.loggingOut : copy.logout}
      </Button>
    </>
  );
}
