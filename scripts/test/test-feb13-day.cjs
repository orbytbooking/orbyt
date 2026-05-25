// Test February 13, 2028 day calculation
const testDate = '2028-02-13';

console.log('🔍 Testing February 13, 2028 day calculation:');
console.log('===========================================');

// Test different date formats
const formats = [
  `${testDate}T00:00:00Z`, // UTC
  `${testDate}T00:00:00`,  // Local
  new Date(testDate),      // Date constructor
];

formats.forEach((format, index) => {
  const date = new Date(format);
  console.log(`\nFormat ${index + 1}: ${format}`);
  console.log(`  - Date object: ${date.toString()}`);
  console.log(`  - UTC string: ${date.toUTCString()}`);
  console.log(`  - getDay(): ${date.getDay()}`);
  console.log(`  - getUTCDay(): ${date.getUTCDay()}`);
  console.log(`  - Date string: ${date.toISOString().split('T')[0]}`);
});

// What day should Feb 13, 2028 be?
console.log('\n📅 Expected: February 13, 2028 should be a SUNDAY');
console.log('   - getUTCDay() should return: 0');
console.log('   - getDay() should return: 0 (if UTC) or 1 (if local +1)');

// Test the actual API logic
console.log('\n🔧 API Logic Test:');
console.log('================');

const apiDate = new Date(testDate + 'T00:00:00Z');
const apiDayOfWeek = apiDate.getUTCDay();

console.log(`API would calculate:`);
console.log(`  - Date: ${testDate}`);
console.log(`  - Date object: ${apiDate.toString()}`);
console.log(`  - getUTCDay(): ${apiDayOfWeek}`);
console.log(`  - Day name: ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][apiDayOfWeek]}`);

// Test the frontend logic
console.log('\n🎨 Frontend Logic Test:');
console.log('====================');

const frontendDate = new Date(testDate + 'T00:00:00Z');
const frontendDayOfWeek = frontendDate.getUTCDay();

console.log(`Frontend would calculate:`);
console.log(`  - Date: ${testDate}`);
console.log(`  - Date object: ${frontendDate.toString()}`);
console.log(`  - getUTCDay(): ${frontendDayOfWeek}`);
console.log(`  - Day name: ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][frontendDayOfWeek]}`);

console.log('\n✅ Match Check:');
console.log(`API day_of_week: ${apiDayOfWeek}`);
console.log(`Frontend day_of_week: ${frontendDayOfWeek}`);
console.log(`Match: ${apiDayOfWeek === frontendDayOfWeek ? 'YES ✅' : 'NO ❌'}`);
