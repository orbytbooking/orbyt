// Debug script to check logo display state
// Run this in browser console on the your-info page

console.log('🔍 Debugging Logo Display State...');

// Check LogoContext
const logoContext = window.__LOGO_CONTEXT__ || 'Not available';
console.log('LogoContext state:', logoContext);

// Check business data
fetch('/api/admin/business')
  .then(response => response.json())
  .then(data => {
    console.log('Business data from API:', data);
    console.log('Logo URL from business:', data.business?.logo_url);
  })
  .catch(error => console.error('Error fetching business:', error));

// Check current state in DOM
const logoPreview = document.querySelector('img[alt="Logo preview"]');
console.log('Logo preview element:', logoPreview);
if (logoPreview) {
  console.log('Logo preview src:', logoPreview.src);
  console.log('Logo preview visible:', logoPreview.offsetParent !== null);
}

// Check localStorage
const storedLogo = localStorage.getItem('adminLogo');
console.log('Stored logo in localStorage:', storedLogo);

// Check if it's a blob URL
if (storedLogo) {
  console.log('Is blob URL:', storedLogo.startsWith('blob:'));
  console.log('Is HTTP URL:', storedLogo.startsWith('http'));
}

// Check current business context
const businessData = window.__BUSINESS_CONTEXT__ || 'Not available';
console.log('Business context:', businessData);

console.log('🔍 Debug complete!');
