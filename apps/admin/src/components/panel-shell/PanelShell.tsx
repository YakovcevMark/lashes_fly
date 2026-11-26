import type { PropsWithChildren } from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import { copy } from '@assets/constants';

export function PanelShell({ children }: PropsWithChildren) {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <Box component="header" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg" sx={{ px: { xs: 5, sm: 8 } }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ py: { xs: 4, md: 5 }, gap: 3 }}
          >
            <Typography
              lang="en"
              sx={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '1.6rem' }}
            >
              {copy.brand}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {copy.cabinet}
            </Typography>
          </Stack>
        </Container>
      </Box>
      <Container
        component="main"
        maxWidth="sm"
        sx={{ px: { xs: 5, sm: 8 }, pt: { xs: 16, sm: 24, md: 32 }, pb: 12 }}
      >
        <Stack spacing={6} alignItems="stretch">
          {children}
        </Stack>
      </Container>
    </Box>
  );
}
