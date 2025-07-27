#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';

/**
 * Converts the latest.json file to CSV format
 */
async function convertJsonToCsv() {
  try {
    // Read the JSON file
    const jsonPath = path.join(process.cwd(), 'data', 'latest.json');
    const data = await fs.readJson(jsonPath);

    if (!data.locations || !Array.isArray(data.locations)) {
      throw new Error('Invalid JSON structure: locations array not found');
    }

    // Define CSV headers
    const headers = [
      'id',
      'entityId',
      'name',
      'address',
      'postalCode',
      'type',
      'LAT',
      'LON',
      'supermarket',
      'hawker_heartland_merchant',
      'budgetmeal',
      'lastResetDate',
    ];

    // Convert locations to CSV rows
    const csvRows = [headers.join(',')];

    for (const location of data.locations) {
      const row = [
        escapeCSVField(location.id || ''),
        escapeCSVField(location.entityId || ''),
        escapeCSVField(location.name || ''),
        escapeCSVField(location.address || ''),
        escapeCSVField(location.postalCode || ''),
        escapeCSVField(location.type || ''),
        location.LAT || '',
        location.LON || '',
        location.filters?.vouchers?.supermarket || false,
        location.filters?.vouchers?.hawker_heartland_merchant || false,
        location.filters?.secondary?.budgetmeal || false,
        escapeCSVField(location.lastResetDate || ''),
      ];

      csvRows.push(row.join(','));
    }

    // Write CSV file
    const csvContent = csvRows.join('\n');
    const csvPath = path.join(process.cwd(), 'data', 'latest.csv');

    await fs.writeFile(csvPath, csvContent, 'utf8');

    console.log(`✅ Successfully converted JSON to CSV`);
    console.log(`📁 Input: ${jsonPath}`);
    console.log(`📁 Output: ${csvPath}`);
    console.log(`📊 Converted ${data.locations.length} locations`);
    console.log(`📅 Last updated: ${data.lastUpdated}`);
  } catch (error) {
    console.error('❌ Error converting JSON to CSV:', error.message);
    process.exit(1);
  }
}

/**
 * Escapes CSV field values to handle commas, quotes, and newlines
 * @param {string} field - The field value to escape
 * @returns {string} - The escaped field value
 */
function escapeCSVField(field) {
  if (typeof field !== 'string') {
    return field;
  }

  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (
    field.includes(',') ||
    field.includes('"') ||
    field.includes('\n') ||
    field.includes('\r')
  ) {
    return `"${field.replace(/"/g, '""')}"`;
  }

  return field;
}

// Run the conversion if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  convertJsonToCsv();
}

export { convertJsonToCsv };
