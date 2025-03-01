const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

// Helper function to fetch an event page and extract its description.
// This function looks for a <div class="description"> and then gathers
// the text from all <p> tags inside it.
async function getEventDescription(eventUrl) {
  try {
    const { data: eventHtml } = await axios.get(eventUrl);
    const $ = cheerio.load(eventHtml);
    const descriptionDiv = $('div.description');
    let descriptionText = '';
    descriptionDiv.find('p').each((i, el) => {
      const pText = $(el).text().trim();
      if (pText) {
        descriptionText += pText + "\n";
      }
    });
    return descriptionText.trim() || null;
  } catch (error) {
    console.error(`Error fetching event page at ${eventUrl}:`, error.message);
    return null;
  }
}

async function scrapeCalendarEvents() {
  const events = [];
  
  // Loop through months 1 to 12 for the year 2025.
  for (let month = 1; month <= 12; month++) {
    const monthStr = month.toString().padStart(2, '0');
    const startDate = `2025-${monthStr}-01`;
    // For December, the end date is January 1, 2026.
    const endDate = month === 12 ? "2026-01-01" : `2025-${(month + 1).toString().padStart(2, '0')}-01`;
    
    const url = `https://www.du.edu/calendar?search=&start_date=${startDate}&end_date=${endDate}#events-listing-date-filter-anchor`;
    console.log(`Scraping events from ${url}`);
    
    try {
      const { data: html } = await axios.get(url);
      const $ = cheerio.load(html);
      
      // Select each event item within the events listing container.
      $('#events-listing .events-listing__item').each((i, el) => {
        const eventCard = $(el).find('a.event-card');
        if (!eventCard.length) return;
        
        // The first <p> is assumed to contain the event date.
        let dateText = eventCard.find('p').first().text().trim();
        if (!/\d{4}/.test(dateText)) {
          dateText = dateText + ', 2025';
        }
        
        // The event title is inside an <h3>.
        const title = eventCard.find('h3').text().trim();
        
        // Look for a <p> element containing a clock icon to get the event time.
        let timeText = '';
        eventCard.find('p').each((j, p) => {
          if ($(p).find('span.icon-du-clock').length) {
            timeText = $(p).text().trim();
          }
        });
        
        // Get the event details URL from the href attribute.
        let eventUrl = eventCard.attr('href');
        if (eventUrl && !eventUrl.startsWith('http')) {
          eventUrl = new URL(eventUrl, "https://www.du.edu/calendar").href;
        }
        
        const eventObj = { title, date: dateText };
        if (timeText) eventObj.time = timeText;
        if (eventUrl) eventObj.url = eventUrl; // temporary, to fetch description later
        events.push(eventObj);
      });
    } catch (error) {
      console.error(`Error scraping ${url}: ${error.message}`);
    }
  }
  
  // For each event, visit its details page to fetch the description.
  for (const event of events) {
    if (event.url) {
      const description = await getEventDescription(event.url);
      if (description) {
        event.description = description;
      }
      // Remove the temporary URL property.
      delete event.url;
    }
  }
  
  const result = { events };
  
  // Ensure the "results" directory exists and write the JSON file.
  await fs.ensureDir(path.join(__dirname, 'results'));
  await fs.writeJson(path.join(__dirname, 'results', 'calendar_events.json'), result, { spaces: 2 });
  console.log('Calendar events data saved to results/calendar_events.json');
}

scrapeCalendarEvents();
