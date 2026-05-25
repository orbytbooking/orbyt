// Test to debug the calendar grid generation issue
function debugCalendarGrid() {
  console.log('=== Debugging Calendar Grid Generation ===');
  
  // Simulate February 2026
  const year = 2026;
  const month = 1; // February (0-indexed)
  
  console.log('\n📋 Test 1: Calendar setup for February 2026...');
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  console.log(`📅 First day of month: ${firstDay.toString()}`);
  console.log(`📅 First day getDay(): ${firstDay.getDay()} (0=Sunday, 6=Saturday)`);
  console.log(`📅 Last day of month: ${lastDay.toString()}`);
  console.log(`📅 Days in month: ${lastDay.getDate()}`);
  
  // Get the day of week for the first day
  const startingDayOfWeek = firstDay.getDay();
  console.log(`🔢 Starting day of week: ${startingDayOfWeek}`);
  
  // Calculate total cells needed
  const daysInMonth = lastDay.getDate();
  const totalCells = startingDayOfWeek + daysInMonth;
  const weeks = Math.ceil(totalCells / 7);
  
  console.log(`📊 Calendar calculations:`);
  console.log(`  - Days in month: ${daysInMonth}`);
  console.log(`  - Starting day offset: ${startingDayOfWeek}`);
  console.log(`  - Total cells needed: ${totalCells}`);
  console.log(`  - Number of weeks: ${weeks}`);
  
  // Generate calendar grid
  console.log('\n📋 Test 2: Generating calendar grid...');
  const calendar = [];
  let dayCounter = 1;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let week = 0; week < weeks; week++) {
    const weekDays = [];
    console.log(`\nWeek ${week + 1}:`);
    
    for (let day = 0; day < 7; day++) {
      const cellIndex = week * 7 + day;
      
      if (cellIndex < startingDayOfWeek || dayCounter > daysInMonth) {
        weekDays.push(null);
        console.log(`  ${dayNames[day]}: [empty] (cellIndex=${cellIndex}, dayCounter=${dayCounter})`);
      } else {
        const dateObj = new Date(year, month, dayCounter);
        weekDays.push(dateObj);
        const dayOfWeek = dateObj.getDay();
        console.log(`  ${dayNames[day]}: ${dayCounter} (date=${dateObj.toDateString()}, getDay()=${dayOfWeek})`);
        
        // Check if this is Feb 12 (Thursday)
        if (dayCounter === 12) {
          console.log(`    🎯 Found Feb 12!`);
          console.log(`    📅 Date: ${dateObj.toString()}`);
          console.log(`    🔢 getDay(): ${dayOfWeek} (${dayNames[dayOfWeek]})`);
          console.log(`    📊 Calendar column: ${day} (${dayNames[day]})`);
          console.log(`    ✅ Match: ${dayOfWeek === day} ? 'YES' : 'NO'}`);
        }
        
        dayCounter++;
      }
    }
    calendar.push(weekDays);
  }
  
  // Test 3: Check specific dates
  console.log('\n📋 Test 3: Checking specific dates in calendar...');
  const targetDates = [
    { date: 12, expectedDay: 4, expectedName: 'Thursday' }, // Feb 12
    { date: 13, expectedDay: 5, expectedName: 'Friday' },   // Feb 13
    { date: 11, expectedDay: 3, expectedName: 'Wednesday' } // Feb 11
  ];
  
  targetDates.forEach(target => {
    console.log(`\n🔍 Looking for Feb ${target.date} (${target.expectedName}):`);
    
    let found = false;
    for (let week = 0; week < calendar.length; week++) {
      for (let day = 0; day < 7; day++) {
        const cellDate = calendar[week][day];
        if (cellDate && cellDate.getDate() === target.date) {
          const actualDay = cellDate.getDay();
          const actualName = dayNames[actualDay];
          const columnName = dayNames[day];
          
          console.log(`  📍 Found at Week ${week + 1}, Column ${day} (${columnName})`);
          console.log(`  📅 Date: ${cellDate.toDateString()}`);
          console.log(`  🔢 getDay(): ${actualDay} (${actualName})`);
          console.log(`  📊 Expected: ${target.expectedDay} (${target.expectedName})`);
          console.log(`  ✅ Correct day: ${actualDay === target.expectedDay ? 'YES' : 'NO'}`);
          console.log(`  🎯 Column matches day: ${actualDay === day ? 'YES' : 'NO'}`);
          
          found = true;
          break;
        }
      }
      if (found) break;
    }
    
    if (!found) {
      console.log(`  ❌ Feb ${target.date} not found in calendar!`);
    }
  });
  
  // Test 4: Simulate slot assignment
  console.log('\n📋 Test 4: Simulating slot assignment...');
  console.log('Scenario: User clicks on Feb 12 (Thursday) and adds a slot');
  
  // Find Feb 12 in calendar
  let feb12Location = null;
  for (let week = 0; week < calendar.length; week++) {
    for (let day = 0; day < 7; day++) {
      const cellDate = calendar[week][day];
      if (cellDate && cellDate.getDate() === 12) {
        feb12Location = { week, day, date: cellDate };
        break;
      }
    }
    if (feb12Location) break;
  }
  
  if (feb12Location) {
    console.log(`📍 Feb 12 found at Week ${feb12Location.week + 1}, Column ${feb12Location.day}`);
    console.log(`📅 Date: ${feb12Location.date.toString()}`);
    console.log(`🔢 getDay(): ${feb12Location.date.getDay()}`);
    console.log(`📊 Column: ${feb12Location.day} (${dayNames[feb12Location.day]})`);
    
    // Simulate API storing slot
    const slotDayOfWeek = feb12Location.date.getDay();
    console.log(`💾 API stores slot with day_of_week: ${slotDayOfWeek}`);
    
    // Simulate frontend displaying slot
    console.log(`🖥️ Frontend looks for slots with day_of_week: ${slotDayOfWeek}`);
    console.log(`🖥️ Frontend checks column ${feb12Location.day} for matching slots`);
    console.log(`✅ Display match: ${feb12Location.day === slotDayOfWeek ? 'YES' : 'NO'}`);
    
    if (feb12Location.day !== slotDayOfWeek) {
      console.log(`🚨 ISSUE FOUND!`);
      console.log(`   - Feb 12 is in calendar column ${feb12Location.day} (${dayNames[feb12Location.day]})`);
      console.log(`   - But slot is stored with day_of_week ${slotDayOfWeek} (${dayNames[slotDayOfWeek]})`);
      console.log(`   - Slot will appear in column ${slotDayOfWeek} (${dayNames[slotDayOfWeek]}) instead!`);
    }
  }
  
  console.log('\n🎉 Calendar debug complete!');
  console.log('\n💡 If slots appear in wrong column, the issue is:');
  console.log('1. Calendar grid layout vs day_of_week mismatch');
  console.log('2. Date object creation differences');
  console.log('3. Timezone affecting date calculations');
}

debugCalendarGrid();
