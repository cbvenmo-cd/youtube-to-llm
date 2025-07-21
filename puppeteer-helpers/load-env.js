/**
 * Load environment variables from .env.puppeteer file
 */

const path = require('path');
const fs = require('fs');

// Load .env.puppeteer if it exists
const envPath = path.join(__dirname, '..', '.env.puppeteer');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('Loaded environment from .env.puppeteer');
} else {
    console.log('No .env.puppeteer file found, using system environment variables');
}

module.exports = {};
