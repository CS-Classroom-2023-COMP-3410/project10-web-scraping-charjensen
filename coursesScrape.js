const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

async function scrapeCourses() {
  try {
    // Fetch the DU Bulletin page (update with the actual URL)
    const { data: html } = await axios.get('https://bulletin.du.edu/undergraduate/majorsminorscoursedescriptions/traditionalbachelorsprogrammajorandminors/computerscience/#coursedescriptionstext');

    // Load the HTML into Cheerio
    const $ = cheerio.load(html);

    // Array to store matching courses
    const courses = [];

    // Loop over each course block (adjust the selector based on actual page structure)
    $('.courseblock').each((i, element) => {
      // Extract course title which includes the course code and title.
      const titleText = $(element).find('.courseblocktitle').text().trim();

      // Look for a course code pattern, e.g., "COMP-XXXX"
      const codeMatch = titleText.match(/COMP\s+(\d{4})/);
      if (codeMatch) {
        const courseCode = codeMatch[1];

        // Extract the numeric part of the course code to check if it's 3000-level or above.
        const courseNumber = parseInt(courseCode.split('-')[1], 10);
        if (codeMatch) {
            // Extract the course number from the capturing group
            const courseNumber = parseInt(codeMatch[1], 10);
            if (courseNumber >= 3000) {
              // Reformat the course code to include a hyphen (if desired) and push to courses array
              courses.push({
                course: `COMP-${codeMatch[1]}`,
                title: titleText
              });
            }
          }
      }
    });

    // Build the final JSON object
    const result = { courses };

    // Ensure the results directory exists
    await fs.ensureDir(path.join(__dirname, 'results'));

    // Write the data to results/bulletin.json with formatted JSON (2-space indentation)
    await fs.writeJson(path.join(__dirname, 'results', 'bulletin.json'), result, { spaces: 2 });
    console.log('Data successfully saved to results/bulletin.json');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// Execute the scraping function
scrapeCourses();
