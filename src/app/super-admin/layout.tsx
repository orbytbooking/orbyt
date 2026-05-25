import { SuperAdminGuard } from './SuperAdminGuard';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SuperAdminGuard>{children}</SuperAdminGuard>;
}
