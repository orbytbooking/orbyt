// Test the exact profile picture URL that's being loaded
const profilePictureUrl = "https://gpalzskadkrfedlwqobq.supabase.co/storage/v1/object/public/avatars/76f6a2f5-5feb-4b1a-801c-d27f7212c611-test-1769387618294.png";

console.log('🧪 Testing Profile Picture URL Loading...');
console.log('URL:', profilePictureUrl);

// Test 1: Fetch the image
fetch(profilePictureUrl, { method: 'HEAD' })
  .then(response => {
    console.log('✅ HEAD Request Status:', response.status);
    console.log('✅ Content-Type:', response.headers.get('content-type'));
    console.log('✅ Content-Length:', response.headers.get('content-length'));
    console.log('✅ Cache-Control:', response.headers.get('cache-control'));
    console.log('✅ CORS Headers:', response.headers.get('access-control-allow-origin'));
    
    // Test 2: Try to load as image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      console.log('✅ Image loaded successfully as <img> element');
      console.log('✅ Natural dimensions:', img.naturalWidth, 'x', img.naturalHeight);
    };
    img.onerror = (e) => {
      console.error('❌ Image failed to load as <img> element:', e);
      console.error('❌ Error details:', e);
    };
    img.src = profilePictureUrl;
    
    // Test 3: Check if it's a CORS issue
    if (response.status === 200) {
      console.log('✅ Image is accessible, checking for potential issues...');
      
      // Log common issues
      if (!response.headers.get('access-control-allow-origin')) {
        console.warn('⚠️  No CORS header found - this might cause issues in browser');
      }
      
      if (response.headers.get('content-type') !== 'image/png' && response.headers.get('content-type') !== 'image/jpeg') {
        console.warn('⚠️  Unexpected content type:', response.headers.get('content-type'));
      }
    }
  })
  .catch(error => {
    console.error('❌ Network error:', error);
  });

// Test 4: Try in a simple HTML context
console.log('📋 Creating test HTML...');
const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Profile Picture Test</title>
</head>
<body>
    <h1>Profile Picture Test</h1>
    <img src="${profilePictureUrl}" alt="Test Profile Picture" style="border: 2px solid red; max-width: 200px;" 
         onerror="console.error('Image failed to load in HTML');" 
         onload="console.log('Image loaded successfully in HTML');" />
    <script>
        console.log('Test page loaded');
        const img = document.querySelector('img');
        console.log('Image element:', img);
        console.log('Image src:', img.src);
    </script>
</body>
</html>
`;

console.log('Test HTML (you can save this as test.html and open in browser):');
console.log(testHtml);
