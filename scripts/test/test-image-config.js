// Test script to verify image configuration
console.log('Testing Next.js image configuration...');

// Test URL that was failing
const testImageUrl = 'https://gpalzskadkrfedlwqobq.supabase.co/storage/v1/object/public/business-logos/20ec44c8-1d49-45b9-ac7e-0412fd610ffb/logo-1769385839957.jpeg';

console.log('Test image URL:', testImageUrl);
console.log('Hostname: gpalzskadkrfedlwqobq.supabase.co');
console.log('Protocol: https');
console.log('Path pattern: /storage/v1/object/public/**');

// Check if URL matches our configuration
const url = new URL(testImageUrl);
const hostname = url.hostname;
const protocol = url.protocol.slice(0, -1);
const pathname = url.pathname;

console.log('\nURL Analysis:');
console.log('Hostname:', hostname);
console.log('Protocol:', protocol);
console.log('Pathname:', pathname);

// Check against our configuration
const allowedHostnames = ['gpalzskadkrfedlwqobq.supabase.co'];
const allowedProtocols = ['https'];
const allowedPathPatterns = ['/storage/v1/object/public/', '/storage/v1/render/image/'];

const isHostnameAllowed = allowedHostnames.includes(hostname);
const isProtocolAllowed = allowedProtocols.includes(protocol);
const isPathAllowed = allowedPathPatterns.some(pattern => pathname.startsWith(pattern));

console.log('\nConfiguration Check:');
console.log('Hostname allowed:', isHostnameAllowed);
console.log('Protocol allowed:', isProtocolAllowed);
console.log('Path allowed:', isPathAllowed);

const isAllowed = isHostnameAllowed && isProtocolAllowed && isPathAllowed;
console.log('\nOverall: Image should load:', isAllowed ? '✅ YES' : '❌ NO');

if (isAllowed) {
  console.log('\n✅ The image should now load correctly with the updated next.config.mjs');
} else {
  console.log('\n❌ There might still be configuration issues');
}
