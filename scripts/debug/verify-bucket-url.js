// Verify your bucket URL format and check if it matches expected format

console.log('🔍 Verifying Bucket URL Format...');
console.log('');

// Your provided bucket endpoint
const yourBucketEndpoint = 'https://gpalzskadkrfedlwqobq.storage.supabase.co/storage/v1/s3';

// Expected Supabase Storage URL format
const expectedFormat = {
  storageApi: 'https://[project-ref].supabase.co/storage/v1',
  publicUrl: 'https://[project-ref].supabase.co/storage/v1/object/public/avatars/[filename]',
  s3Endpoint: 'https://[project-ref].storage.supabase.co/storage/v1/s3'
};

console.log('📋 URL Analysis:');
console.log('- Your endpoint:', yourBucketEndpoint);
console.log('- Project ref:', 'gpalzskadkrfedlwqobq');
console.log('- Expected format:', expectedFormat.s3Endpoint.replace('[project-ref]', 'gpalzskadkrfedlwqobq'));
console.log('');

// Check if format matches
const projectRef = 'gpalzskadkrfedlwqobq';
const expectedS3Url = `https://${projectRef}.storage.supabase.co/storage/v1/s3`;

if (yourBucketEndpoint === expectedS3Url) {
  console.log('✅ Bucket URL format is correct!');
} else {
  console.log('⚠️  URL format check needed');
}

console.log('');
console.log('🎯 Expected Public URL Format:');
console.log('https://gpalzskadkrfedlwqobq.supabase.co/storage/v1/object/public/avatars/[filename]');
console.log('');

console.log('🔧 To test your bucket:');
console.log('1. Run the SQL in database/check_storage.sql');
console.log('2. Try uploading an image in the profile page');
console.log('3. Check the console for upload logs');
console.log('4. Verify the image appears in your Supabase dashboard');
