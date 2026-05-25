// Run this in your browser console to clear ALL localStorage items
console.log('Clearing ALL localStorage items...');

// Get all localStorage items before clearing
console.log('Current localStorage items:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`- ${key}: ${value?.substring(0, 50)}${value?.length > 50 ? '...' : ''}`);
}

// Clear ALL localStorage items
localStorage.clear();

console.log('✅ All localStorage items cleared!');
console.log('Please refresh the page to start fresh.');
