const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

(async () => {
  try {
    // Launch Puppeteer in headless mode.
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Navigate to the DU Athletics homepage and wait until network is idle.
    await page.goto('https://denverpioneers.com/index.aspx', { waitUntil: 'networkidle0' });
    
    // Wait for the slick-track (carousel container) to be rendered.
    await page.waitForSelector('.slick-track');

    // Get the fully rendered page content.
    const content = await page.content();
    const $ = cheerio.load(content);

    const events = [];
    // Select carousel items inside the slick-track container.
    const items = $('.slick-track .c-scoreboard__item');
    console.log(`Found ${items.length} carousel items.`);

    // Iterate over each carousel item.
    items.each((i, element) => {
      // Look for an element whose aria-label starts with "Game information for"
      const ariaLabel = $(element).find('[aria-label^="Game information for"]').attr('aria-label');
      if (ariaLabel) {
        // For example, an aria-label might be:
        // "Game information for Denver University Men's Tennis versus #65 Utah State on 2/21/2025 at 5 p.m. MT"
        const regex = /Game information for (.+?) versus (.+?) on (.+?) at/;
        const match = ariaLabel.match(regex);
        if (match) {
          const duTeam = match[1].trim();
          const opponent = match[2].trim();
          const date = match[3].trim();
          events.push({ duTeam, opponent, date });
        } else {
          console.log(`Regex did not match for item ${i}: ${ariaLabel}`);
        }
      } else {
        console.log(`No aria-label found for carousel item ${i}`);
      }
    });

    if (!events.length) {
      console.warn('No events extracted. Verify that the selector or regex is correct.');
    }

    const result = { events };

    // Ensure the results directory exists and save the JSON file.
    await fs.ensureDir(path.join(__dirname, 'results'));
    await fs.writeJson(path.join(__dirname, 'results', 'athletic_events.json'), result, { spaces: 2 });
    console.log('Athletic events data saved to results/athletic_events.json');

    await browser.close();
  } catch (error) {
    console.error('Error scraping athletic events:', error);
  }
})();
