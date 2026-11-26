import { createHashRouter, Navigate, Outlet } from 'react-router';
import { PanelShell } from '@components/panel-shell';
import { CabinetPage } from '@pages/cabinet';
import { LoginPage } from '@pages/login';

// Hash routes keep direct private links addressable on static GitHub Pages hosting.
export const router = createHashRouter([
  {
    element: (
      <PanelShell>
        <Outlet />
      </PanelShell>
    ),
    children: [
      { index: true, element: <Navigate replace to="/panel" /> },
      { path: 'panel', element: <CabinetPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: '*', element: <Navigate replace to="/panel" /> },
    ],
  },
]);
