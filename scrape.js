import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_URL = 'https://prd-tmp.cdn.gowhere.gov.sg/assets/cdcvouchersgowhere/data.gzip?v=2';
const DATA_DIR = path.join(__dirname, 'data');
const LATEST_DATA_PATH = path.join(DATA_DIR, 'latest.json');
const README_PATH = path.join(__dirname, 'README.md');

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);

// Initialize README if it doesn't exist
if (!fs.existsSync(README_PATH)) {
  console.warn('README.md not found. Please create one.');
  process.exit(1);
}

async function scrapeData() {
  try {
    // Fetch the data (it's actually JSON despite the .gzip extension)
    const response = await fetch(DATA_URL);
    
    // Parse the JSON data directly
    const data = await response.json();
    
    // Extract the locations array from the response
    const { locations } = data;
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Process changes
    await processChanges(locations, today, data.lastUpdated);
    
    // Update latest data
    fs.writeJsonSync(LATEST_DATA_PATH, data, { spaces: 2 });
    
    console.log('Data scraped and processed successfully');
  } catch (error) {
    console.error('Error scraping data:', error);
    process.exit(1);
  }
}

async function processChanges(newData, date, lastUpdated) {
  // If no previous data exists, just save the current data
  if (!fs.existsSync(LATEST_DATA_PATH)) {
    console.log('No previous data found. Saving current data as baseline.');
    return;
  }
  
  // Load previous data
  const oldData = fs.readJsonSync(LATEST_DATA_PATH);
  const oldLocations = oldData.locations || [];
  
  // Create maps for easier comparison
  const oldMap = new Map();
  const newMap = new Map();
  
  oldLocations.forEach(item => oldMap.set(item.id, item));
  newData.forEach(item => newMap.set(item.id, item));
  
  // Find added, removed, and changed items
  const added = [];
  const removed = [];
  const changed = [];
  
  // Find added and changed items
  for (const [id, newItem] of newMap.entries()) {
    if (!oldMap.has(id)) {
      added.push(newItem);
    } else {
      const oldItem = oldMap.get(id);
      // Compare relevant fields to detect changes
      if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
        changed.push({
          old: oldItem,
          new: newItem
        });
      }
    }
  }
  
  // Find removed items
  for (const [id, oldItem] of oldMap.entries()) {
    if (!newMap.has(id)) {
      removed.push(oldItem);
    }
  }
  
  // Only update README if there are changes
  if (added.length > 0 || removed.length > 0 || changed.length > 0) {
    updateReadme(date, added, removed, changed, lastUpdated);
    console.log(`Changes detected: ${added.length} added, ${removed.length} removed, ${changed.length} changed`);
  } else {
    console.log('No changes detected');
  }
}

function updateReadme(date, added, removed, changed, lastUpdated) {
  // Don't do anything if there are no changes
  if (added.length === 0 && removed.length === 0 && changed.length === 0) {
    return;
  }
  
  let readmeContent = fs.readFileSync(README_PATH, 'utf8');
  
  // Create the changelog entry
  let changelogEntry = `## ${date}\n\n`;
  
  // Add lastUpdated info if available
  if (lastUpdated) {
    changelogEntry += `Last updated by source: ${lastUpdated}\n\n`;
  }
  
  if (added.length > 0) {
    changelogEntry += `### Added (${added.length})\n\n`;
    added.forEach(item => {
      changelogEntry += `- ${item.name} (${item.address})\n`;
    });
    changelogEntry += '\n';
  }
  
  if (removed.length > 0) {
    changelogEntry += `### Removed (${removed.length})\n\n`;
    removed.forEach(item => {
      changelogEntry += `- ${item.name} (${item.address})\n`;
    });
    changelogEntry += '\n';
  }
  
  if (changed.length > 0) {
    changelogEntry += `### Changed (${changed.length})\n\n`;
    changed.forEach(change => {
      changelogEntry += `- ${change.new.name} (${change.new.address})\n`;
      // You can add more detailed change information here if needed
    });
    changelogEntry += '\n';
  }
  
  // Find the placeholder comment to insert the new changelog
  const placeholderPos = readmeContent.indexOf('<!-- CHANGELOG_ENTRIES -->');
  
  if (placeholderPos !== -1) {
    // Insert the new changelog entry after the placeholder
    readmeContent = [
      readmeContent.slice(0, placeholderPos + '<!-- CHANGELOG_ENTRIES -->'.length),
      '\n\n',
      changelogEntry,
      readmeContent.slice(placeholderPos + '<!-- CHANGELOG_ENTRIES -->'.length)
    ].join('');
  } else {
    // Fallback to the old method if placeholder is not found
    const headerEndPos = readmeContent.indexOf('\n\n') + 2;
    readmeContent = [
      readmeContent.slice(0, headerEndPos),
      changelogEntry,
      readmeContent.slice(headerEndPos)
    ].join('');
  }
  
  // Write the updated content back to README.md
  fs.writeFileSync(README_PATH, readmeContent);
  
  console.log(`README.md updated with changes for ${date}`);
}

// Run the scraper
scrapeData();