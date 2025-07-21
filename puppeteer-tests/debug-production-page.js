/**
 * Debug Production Page - Check what's actually rendered in production mode
 */

// Load environment variables from .env.puppeteer
require('../puppeteer-helpers/load-env');

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function debugProductionPage() {
    let browser = null;
    let page = null;
    
    try {
        console.log('=== Debugging Production Page Structure ===\n');
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 100,
            devtools: true
        });
        
        page = await browser.newPage();
        
        // Load cookies if they exist
        const cookiePath = path.join(__dirname, '..', 'puppeteer-data', 'cookies.json');
        try {
            const cookiesString = await fs.readFile(cookiePath, 'utf8');
            const cookies = JSON.parse(cookiesString);
            await page.setCookie(...cookies);
            console.log('✓ Cookies loaded');
        } catch (e) {
            console.log('No cookies found, will need to login');
        }
        
        // Navigate to home page
        await page.goto('http://localhost:8080/', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        console.log('Current URL:', page.url());
        
        // Wait a bit for any redirects or dynamic content
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('Final URL:', page.url());
        
        // Check page structure
        const pageInfo = await page.evaluate(() => {
            // Get all form elements
            const forms = Array.from(document.querySelectorAll('form')).map(form => ({
                id: form.id,
                action: form.action,
                className: form.className
            }));
            
            // Get all input elements
            const inputs = Array.from(document.querySelectorAll('input')).map(input => ({
                id: input.id,
                name: input.name,
                type: input.type,
                placeholder: input.placeholder,
                className: input.className
            }));
            
            // Get all sections
            const sections = Array.from(document.querySelectorAll('section')).map(section => ({
                className: section.className,
                id: section.id,
                hasContent: section.textContent.trim().length > 0
            }));
            
            // Look for specific elements
            const elements = {
                videoUrl: document.querySelector('#videoUrl'),
                analyzeForm: document.querySelector('#analyzeForm'),
                analyzeButton: document.querySelector('#analyzeButton'),
                analysesList: document.querySelector('#analysesList'),
                previousAnalyses: document.querySelector('.previous-analyses'),
                analysisSection: document.querySelector('.analysis-section')
            };
            
            // Get page title and main content
            const pageTitle = document.title;
            const bodyClasses = document.body.className;
            const h1Text = document.querySelector('h1')?.textContent;
            
            return {
                pageTitle,
                bodyClasses,
                h1Text,
                forms,
                inputs,
                sections,
                elementExists: {
                    videoUrl: !!elements.videoUrl,
                    analyzeForm: !!elements.analyzeForm,
                    analyzeButton: !!elements.analyzeButton,
                    analysesList: !!elements.analysesList,
                    previousAnalyses: !!elements.previousAnalyses,
                    analysisSection: !!elements.analysisSection
                },
                // Get actual HTML of main content area
                mainContent: document.querySelector('main')?.innerHTML?.substring(0, 500)
            };
        });
        
        console.log('\nPage Information:');
        console.log('================');
        console.log('Title:', pageInfo.pageTitle);
        console.log('H1:', pageInfo.h1Text);
        console.log('Body Classes:', pageInfo.bodyClasses);
        
        console.log('\nElement Existence:');
        console.log('==================');
        Object.entries(pageInfo.elementExists).forEach(([element, exists]) => {
            console.log(`${element}: ${exists ? '✓' : '✗'}`);
        });
        
        console.log('\nForms Found:', pageInfo.forms.length);
        pageInfo.forms.forEach(form => {
            console.log(`- Form: ${form.id || 'no-id'} (${form.className || 'no-class'})`);
        });
        
        console.log('\nInputs Found:', pageInfo.inputs.length);
        pageInfo.inputs.forEach(input => {
            console.log(`- Input: ${input.id || 'no-id'} type=${input.type} placeholder="${input.placeholder || ''}"`);
        });
        
        console.log('\nSections Found:', pageInfo.sections.length);
        pageInfo.sections.forEach(section => {
            console.log(`- Section: ${section.id || 'no-id'} (${section.className || 'no-class'}) has-content=${section.hasContent}`);
        });
        
        if (pageInfo.mainContent) {
            console.log('\nMain Content Preview:');
            console.log('====================');
            console.log(pageInfo.mainContent.replace(/<[^>]*>/g, ' ').substring(0, 200) + '...');
        }
        
        // Take screenshots
        await page.screenshot({
            path: 'puppeteer-screenshots/debug-production-page.png',
            fullPage: true
        });
        console.log('\n✓ Screenshot saved: debug-production-page.png');
        
        // Keep browser open for manual inspection
        console.log('\nKeeping browser open for 15 seconds for inspection...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
    } catch (error) {
        console.error('Debug failed:', error);
        if (page) {
            await page.screenshot({
                path: 'puppeteer-screenshots/debug-production-error.png',
                fullPage: true
            }).catch(() => null);
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the debug
if (require.main === module) {
    debugProductionPage().catch(console.error);
}

module.exports = debugProductionPage;
