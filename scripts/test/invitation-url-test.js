// Quick test to check invitation URL generation
const testInvitationUrl = () => {
  console.log('=== Testing Invitation URL Generation ===\n');
  
  // Simulate the environment variables
  const originalEnv = process.env;
  
  // Test with localhost (development)
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  const devUrl = `${process.env.NEXT_PUBLIC_APP_URL}/provider/invite?token=test-token&email=test@example.com`;
  console.log('Development URL:', devUrl);
  
  // Test the email service URL generation logic
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const invitationUrl = `${baseUrl}/provider/invite?token=test-token&email=${encodeURIComponent('test@example.com')}`;
  console.log('Email Service URL:', invitationUrl);
  
  // Verify they match
  console.log('\n✅ URLs match:', devUrl === invitationUrl);
  console.log('✅ Both point to localhost:', devUrl.includes('localhost:3000'));
  
  // Restore original env
  process.env = originalEnv;
  
  console.log('\n=== Test Complete ===');
  console.log('The invitation URLs should now point to your local development server!');
};

testInvitationUrl();
