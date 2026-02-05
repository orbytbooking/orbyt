"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestAuthPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setTestResults(prev => [...prev, `❌ Session error: ${error.message}`]);
        } else {
          setSession(session);
          setTestResults(prev => [...prev, `✅ Session found: ${session ? 'Yes' : 'No'}`]);
          if (session) {
            setTestResults(prev => [...prev, `✅ User ID: ${session.user.id}`]);
            setTestResults(prev => [...prev, `✅ User email: ${session.user.email}`]);
          }
        }

        // Test business API
        const businessResponse = await fetch('/api/admin/business');
        const businessData = await businessResponse.json();
        
        setTestResults(prev => [...prev, `📊 Business API Status: ${businessResponse.status}`]);
        setTestResults(prev => [...prev, `📊 Business API OK: ${businessResponse.ok}`]);
        
        if (businessResponse.ok && businessData.business) {
          setTestResults(prev => [...prev, `✅ Business found: ${businessData.business.name}`]);
          setTestResults(prev => [...prev, `📝 Business ID: ${businessData.business.id}`]);
        } else {
          setTestResults(prev => [...prev, `❌ Business API error: ${businessData.error}`]);
        }

        // Test upload API (without file)
        if (businessData.business) {
          const formData = new FormData();
          formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');
          formData.append('businessId', businessData.business.id);
          
          const uploadResponse = await fetch('/api/admin/business/upload-logo', {
            method: 'POST',
            body: formData
          });
          
          const uploadData = await uploadResponse.json();
          
          setTestResults(prev => [...prev, `📤 Upload API Status: ${uploadResponse.status}`]);
          setTestResults(prev => [...prev, `📤 Upload API OK: ${uploadResponse.ok}`]);
          
          if (uploadResponse.ok) {
            setTestResults(prev => [...prev, `✅ Upload API authentication working!`]);
          } else {
            setTestResults(prev => [...prev, `❌ Upload API error: ${uploadData.error}`]);
          }
        }

      } catch (error) {
        setTestResults(prev => [...prev, `❌ Test error: ${error}`]);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123',
    });

    if (error) {
      setTestResults(prev => [...prev, `❌ Login error: ${error.message}`]);
    } else {
      setTestResults(prev => [...prev, `✅ Login successful!`]);
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setTestResults(prev => [...prev, `❌ Logout error: ${error.message}`]);
    } else {
      setTestResults(prev => [...prev, `✅ Logout successful!`]);
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Test Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Status</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div>
              <p><strong>Logged in:</strong> {session ? 'Yes' : 'No'}</p>
              {session && (
                <div>
                  <p><strong>User ID:</strong> {session.user.id}</p>
                  <p><strong>Email:</strong> {session.user.email}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4 space-x-4">
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Test Login
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <p key={index} className="font-mono text-sm">{result}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
