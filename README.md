# WebHarvest
A powerful Chrome extension for extracting webpage content with preserved structure and styling. `**Educational Purpose ONLY!**`

## Technical Details
- Built with vanilla JavaScript
- Uses Chrome Extension Manifest V3
- Framework detection through DOM analysis
- Real-time code extraction and processing

## Features
-  Extract complete HTML structure
-  Capture CSS styles (inline, external, and computed)
-  Extract JavaScript code (inline, external)
-  Automatic Framework Detection & Extraction 
-  Preview extracted content
-  Copy to clipboard
-  Download as files
-  Maintains original layout and styling

## Installation
1. Download the latest release from the [Releases](https://github.com/RAHUL-art-create/WebHarvest/releases) page
2. Unzip the downloaded file
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the `src` folder from the unzipped directory

## Usage
1. Click the WebHarvest icon in your Chrome toolbar
2. Select what you want to extract:
   - HTML structure
   - CSS styles
   - JavaScript code
   - Computed styles
3. Click "Extract"
4. Use the tabs to view different types of content
5. Copy, download, or preview the extracted code

## Known Issues
- Some frameworks may require specific conditions for detection
- External script content may not be available due to CORS restrictions
- Framework version detection might be limited in some cases
