// Test slot filtering logic for both custom and recurring slots

console.log('🔍 Testing Slot Filtering Logic');
console.log('===============================');

// Simulate the database slots
const mockSlots = [
  // Custom slot for Feb 13, 2028
  {
    id: 'custom-1',
    day_of_week: 0, // Sunday
    start_time: '09:00:00',
    end_time: '10:00:00',
    effective_date: '2028-02-13', // Specific date
    expiry_date: null,
    is_available: true
  },
  // Recurring slot for all Sundays
  {
    id: 'recurring-1',
    day_of_week: 0, // Sunday
    start_time: '14:00:00',
    end_time: '16:00:00',
    effective_date: null, // Recurring
    expiry_date: null,
    is_available: true
  },
  // Custom slot for different date (shouldn't show)
  {
    id: 'custom-2',
    day_of_week: 0, // Sunday
    start_time: '11:00:00',
    end_time: '12:00:00',
    effective_date: '2028-02-20', // Different Sunday
    expiry_date: null,
    is_available: true
  },
  // Recurring slot for Monday (shouldn't show)
  {
    id: 'recurring-2',
    day_of_week: 1, // Monday
    start_time: '09:00:00',
    end_time: '17:00:00',
    effective_date: null, // Recurring
    expiry_date: null,
    is_available: true
  }
];

// Test February 13, 2028 (Sunday)
const testDate = new Date('2028-02-13T00:00:00Z');
const dayOfWeek = testDate.getUTCDay(); // 0 = Sunday
const dateString = testDate.toISOString().split('T')[0]; // '2028-02-13'
const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];

console.log(`\n📅 Testing date: ${testDate.toDateString()}`);
console.log(`   - Day of week: ${dayOfWeek} (${dayName})`);
console.log(`   - Date string: ${dateString}`);
console.log(`   - Total slots in database: ${mockSlots.length}`);

// Apply the filtering logic (same as getSlotsForDate)
const matchingSlots = mockSlots.filter(slot => {
  // Must match day of week
  if (slot.day_of_week !== dayOfWeek) return false;
  
  // If no effective_date, this is a recurring slot (matches all dates)
  if (!slot.effective_date) return true;
  
  // If there's an effective_date, check if current date matches it
  if (slot.effective_date === dateString) return true;
  
  // If there's an expiry_date, check if current date is within range
  if (slot.expiry_date) {
    return dateString >= slot.effective_date && dateString <= slot.expiry_date;
  }
  
  // If only effective_date exists but doesn't match, don't show this slot
  return false;
});

console.log(`\n✅ Matching slots found: ${matchingSlots.length}`);
console.log('================');

matchingSlots.forEach((slot, index) => {
  const type = slot.effective_date ? 'Custom' : 'Recurring';
  const date = slot.effective_date || 'Every week';
  console.log(`${index + 1}. ${type}: ${slot.start_time} - ${slot.end_time} (${date})`);
});

console.log('\n🎯 Expected Results:');
console.log('- 1 custom slot for Feb 13, 2028');
console.log('- 1 recurring slot for all Sundays');
console.log('- Total: 2 slots');

console.log('\n✅ Success Check:');
const success = matchingSlots.length === 2 && 
                matchingSlots.some(s => s.id === 'custom-1') && 
                matchingSlots.some(s => s.id === 'recurring-1');

console.log(`Test ${success ? 'PASSED ✅' : 'FAILED ❌'}`);

if (!success) {
  console.log('\n❌ Issues found:');
  if (matchingSlots.length !== 2) {
    console.log(`   - Wrong number of slots: expected 2, got ${matchingSlots.length}`);
  }
  if (!matchingSlots.some(s => s.id === 'custom-1')) {
    console.log('   - Custom slot not showing');
  }
  if (!matchingSlots.some(s => s.id === 'recurring-1')) {
    console.log('   - Recurring slot not showing');
  }
}
