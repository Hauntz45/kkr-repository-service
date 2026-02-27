const axios = require('axios');
const fs = require('fs');

async function check() {
  try {
    console.log('Fetching data from API...');
    const response = await axios.get('http://localhost:3000/companies');
    const companies = response.data;
    
    console.log(`Found ${companies.length} companies.`);
    
    // Save to file for easy reading
    fs.writeFileSync('database_dump.json', JSON.stringify(companies, null, 2));
    console.log('Data saved to database_dump.json. Open it to inspect.');
    
    // Log unique industries to see distribution
    const industries = [...new Set(companies.map(c => c.industry))];
    console.log('\nUnique Industries:', industries);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

check();
