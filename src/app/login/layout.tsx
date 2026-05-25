// Force dynamic rendering so this route is not prerendered at build time.
export const dynamic = 'force-dynamic';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
