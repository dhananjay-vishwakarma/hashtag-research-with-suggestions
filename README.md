# LinkedIn Assistant

![Extension Logo](ext-logo.png)

## Overview

LinkedIn Assistant is a powerful Chrome extension that helps content creators, marketers, and professionals enhance their LinkedIn experience. It combines hashtag research capabilities with an AI-powered auto-commenter to increase engagement and save time.

## Key Features

### Hashtag Research

- **Bulk Hashtag Research**: Check follower counts for multiple hashtags at once
- **Intelligent Hashtag Suggestions**: Get recommendations for related hashtags with higher follower counts
- **Categorized Results**: View suggested hashtags organized by follower count ranges
- **One-Click Addition**: Click on suggested hashtags to easily add them to your search
- **Automated Research**: Works in the background without disrupting your workflow
- **Search History**: Automatically saves your previous searches for easy reference
- **Persistent Data**: Retains hashtag research even if you close or switch tabs

### AI-Powered Auto Commenter

- **Intelligent Engagement**: Automatically generates and posts thoughtful comments on LinkedIn posts
- **Custom Signature**: Adds your personal signature to each comment for brand recognition
- **ChatGPT Integration**: Uses OpenAI's powerful models to create relevant, context-aware responses
- **Comment Frequency Control**: Choose how often the AI should comment on posts
- **Statistics Tracking**: Monitor your commenting activity with detailed statistics
- **User-Friendly Interface**: Simple controls to enable/disable and customize the auto-commenter
- **Visual Content Recognition**: Analyzes images and videos in posts to generate more contextual comments
- **Engagement Learning**: Improves targeting over time by learning which posts get better engagement
- **Real-Time Status Feedback**: Provides visual feedback about commenting activity and process status

## How It Works

1. Enter one or more hashtags separated by commas
2. The extension opens background tabs to check each hashtag on LinkedIn
3. Follower counts for each hashtag are displayed in a table
4. Related hashtags are suggested based on:
   - Relevance to your entered keywords (30% of score)
   - Follower counts (70% of score)
   - Category and industry associations

## Suggestion Categories

The extension organizes hashtag suggestions into helpful categories:

- **High-Impact Hashtags**: 1M+ followers, providing maximum visibility
- **Growing Hashtags**: 100K-1M followers, offering strong reach with targeted audiences
- **Moderate Hashtags**: 10K-100K followers, good for niche topics with engaged communities
- **Niche Hashtags**: Under 10K followers, specialized communities with high engagement

## Technical Details

The extension uses multiple sophisticated methods to extract and analyze hashtag data:

1. **Content Analysis**: Scans LinkedIn posts and content for hashtag mentions
2. **Sidebar Extraction**: Finds related hashtags from LinkedIn's recommendation sections
3. **Link Pattern Recognition**: Identifies hashtag relationships in LinkedIn's page structure
4. **HTML Pattern Matching**: Uses regex and pattern matching to identify hashtag connections
5. **Intelligent Fallback System**: Provides industry-relevant suggestions even when direct extraction fails
6. **Local Storage**: Saves search history and results for persistent access across browser sessions

### Storage Layout

The extension stores data under two keys in Chrome's local storage:

```
hashtagResults = {
  [hashtag]: {
    followers: "1,234 followers",
    lastChecked: "2024-05-01T12:00:00Z"
  }
}

searchHistory = [
  {
    query: "tag1, tag2",
    hashtags: ["tag1", "tag2"],
    suggestedHashtags: ["related1", "related2"],
    timestamp: "2024-05-01T12:00:00Z"
  }
]
```

Each search references hashtags by name. Follower counts and the last time a hashtag was checked are stored once in `hashtagResults`.

## Auto Commenter Setup

The auto commenter feature requires an OpenAI API key to function:

1. Go to [OpenAI's platform](https://platform.openai.com/api-keys) and create an API key
2. In the extension popup, click on the "Auto Commenter" tab
3. Enter your API key in the designated field
4. Customize your signature that will be added to each comment
5. Adjust the comment frequency to control how often the AI comments on posts
6. Configure visual content analysis options:
   - Image Analysis: Enable to improve comments on posts containing images
   - Video Analysis: Enable to generate better responses to video content (experimental)
7. Click "Save Settings" to apply your configuration
8. Your API key is stored encrypted in Chrome sync storage and only kept in memory when commenting

Once active on LinkedIn, you'll see a status icon (📊) positioned above the chat button in the bottom-right corner that shows real-time information about:
- Posts being evaluated
- Comment generation process
- API responses
- Successful/failed comments
- Auto-scrolling activity

This status display helps you monitor what the auto-commenter is doing and diagnose any issues that may arise.

### Comment Statistics

Track your AI commenting activity with the built-in statistics page:

- View total comments posted
- See success/failure rates
- Monitor token usage for API billing purposes
- Browse comment history with timestamps

## Installation

1. Download the extension files
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the hashtag-research folder
5. The extension icon will appear in your browser toolbar

## Usage Tips

- For best results, start with 2-3 hashtags that are core to your content
- Use a mix of high-follower and niche hashtags for maximum reach
- Click on suggested hashtags to add them to your research
- LinkedIn limits posts to 30 hashtags; focus on quality over quantity
- Industry-specific hashtags often perform better than general ones
- Browse your search history to quickly access previous research

## Privacy & Permissions

This extension:
- Only accesses LinkedIn hashtag pages
- Stores search data locally in your browser only
- Does not collect or transmit any personal data
- Runs entirely in your browser
- Requires tabs permission to check hashtags in background tabs
- Requires storage permission to save your search history locally

## Future Enhancements

Planned features for upcoming releases:
- Hashtag performance tracking over time
- Export functionality for hashtag lists
- Integration with content planning tools
- Hashtag trend analysis
- Custom hashtag grouping and saving
- Advanced search history filtering and organization
- Enhanced image recognition for more accurate visual content analysis
- Improved video content recognition
- Multi-language support for global markets
- Comment sentiment analysis to optimize engagement

## Recent Improvements

### Visual Feedback System
- Added real-time visual feedback for the auto-commenting process
- Fixed positioning of status display toggle (📊) to avoid overlap with chat button (💬)
- Added auto-scrolling functionality to find more posts automatically
- Enhanced the status display with detailed logging of all operations

### Testing Tools
- Added test button (🧪) for verifying auto-commenting functionality on single posts
- Implemented comment preview with edit capability before posting
- Added post highlighting feature to identify and navigate new posts
- Enabled direct comment posting for quick testing

### Debugging Tools
- Added test-positioning.js script to verify UI elements are correctly positioned
- Added window resize handling to maintain proper positioning in all scenarios
- Added debug mode that can be enabled with: `window.autoCommenterStatus.debug(true)`
## Running Tests

Automated tests are written using [Jest](https://jestjs.io/). After installing dependencies, run:

```bash
npm test
```

This will execute the test suite located in the `tests/` directory.
