import { Alert, Button, Typography } from '@mui/material';
import { Navigate, useLocation } from 'react-router';
import { copy } from '@assets/constants';
import { hasApi, responseStatus } from '@api/session-api';
import { useMasterSession, useTelegramLogin } from '@api/api-hooks/session';

export function LoginPage() {
  const location = useLocation();
  const returnPath = location.state?.returnPath === '/panel' ? '/panel' : '/';
  const login = useTelegramLogin(returnPath);
  const { token, query } = useMasterSession();
  if (token && query.isSuccess) return <Navigate replace to={returnPath} />;
  return (
    <>
      <Typography component="h1" variant="h1">
        {copy.login}
      </Typography>
      <Typography color="text.secondary">{copy.intro}</Typography>
      {location.state?.error && <Alert severity="warning">{location.state.error}</Alert>}
      {!hasApi && <Alert severity="info">{copy.notConfigured}</Alert>}
      {login.isError && (
        <Alert severity="error">
          {responseStatus(login.error) === 503 ? copy.notConfigured : copy.unavailable}
        </Alert>
      )}
      <Button
        variant="contained"
        disabled={!hasApi || login.isPending}
        onClick={() => login.mutate()}
      >
        {login.isPending ? copy.signingIn : copy.signIn}
      </Button>
    </>
  );
}
