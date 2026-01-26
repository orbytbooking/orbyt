'use client';

export default function SuperAdminLogin() {
  return (
    <div className="min-h-screen bg-navy admin-theme flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-foreground mb-4">Super Admin Login</h1>
        <p className="text-muted-foreground mb-6">Test page - styling check</p>
        
        <div className="space-y-4">
          <div className="p-4 bg-card/30 rounded-lg border border-border">
            <p className="text-foreground">This should be visible with proper styling</p>
          </div>
          
          <button className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg">
            Test Button
          </button>
        </div>
      </div>
    </div>
  );
}
