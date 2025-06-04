// Load search history data when the page loads
document.addEventListener('DOMContentLoaded', () => {
  migrateHistoryIfNeeded();
  loadSearchHistory();
  
  // Set up event listeners
  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'popup.html';
  });
  
  document.getElementById('clearAllBtn').addEventListener('click', clearAllHistory);
});

// Load search history from local storage
function loadSearchHistory() {
  chrome.storage.local.get(['searchHistory', 'hashtagResults'], (result) => {
    const historyContainer = document.getElementById('historyContainer');
    const detailedHistory = result.searchHistory || [];
    const results = result.hashtagResults || {};
    
    if (detailedHistory.length === 0) {
      historyContainer.innerHTML = `
        <div class="no-history">
          <p>No search history found</p>
          <p>Complete a hashtag search to start building your history</p>
        </div>
      `;
      return;
    }
    
    // Sort history by date (most recent first)
    detailedHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Clear existing content
    historyContainer.innerHTML = '';
    
    // Create elements for each search
    detailedHistory.forEach((historyItem, index) => {
      const searchItem = document.createElement('div');
      searchItem.className = 'search-item';
      
      // Format the search date for display
      const searchDate = new Date(historyItem.timestamp);
      const formattedDate = searchDate.toLocaleDateString() + ' ' + searchDate.toLocaleTimeString();
      
      // Create the header section that shows the search query and date
      const searchHeader = document.createElement('div');
      searchHeader.className = 'search-header';
      searchHeader.innerHTML = `
        <span class="search-query">${historyItem.query}</span>
        <span class="search-date">${formattedDate}</span>
      `;
      
      // Create the details section that will expand when clicked
      const searchDetails = document.createElement('div');
      searchDetails.className = 'search-details';
      searchDetails.id = `search-details-${index}`;
      
      // Add hashtag results table
      let tableContent = '';
      if (historyItem.hashtags && historyItem.hashtags.length > 0) {
        tableContent = `
          <table class="hashtag-table">
            <thead>
              <tr>
                <th>Hashtag</th>
                <th>Followers</th>
                <th>Date Checked</th>
              </tr>
            </thead>
            <tbody>
        `;

        historyItem.hashtags.forEach(tag => {
          const res = results[tag.toLowerCase()] || {};
          const tagDate = res.lastChecked ? new Date(res.lastChecked).toLocaleDateString() : 'N/A';
          tableContent += `
            <tr>
              <td>#${tag}</td>
              <td>${res.followers || 'Not available'}</td>
              <td>${tagDate}</td>
            </tr>
          `;
        });
        
        tableContent += `
            </tbody>
          </table>
        `;
      } else {
        tableContent = '<p>No hashtag data available for this search</p>';
      }
      
      // Add suggested hashtags section
      let suggestionsContent = '';
      if (historyItem.suggestedHashtags && historyItem.suggestedHashtags.length > 0) {
        suggestionsContent = `
          <div class="suggested-tags">
            <h4>Suggested Hashtags:</h4>
            <div class="tags-container">
        `;

        historyItem.suggestedHashtags.forEach(tag => {
          const res = results[tag.toLowerCase()] || {};
          suggestionsContent += `
            <div class="suggested-tag">
              #${tag} <span class="follower-count">${res.followers || ''}</span>
            </div>
          `;
        });
        
        suggestionsContent += `
            </div>
          </div>
        `;
      } else {
        suggestionsContent = '<p>No suggested hashtags available for this search</p>';
      }
      
      // Combine table and suggestions
      searchDetails.innerHTML = tableContent + suggestionsContent;
      
      // Add elements to the container
      searchItem.appendChild(searchHeader);
      searchItem.appendChild(searchDetails);
      historyContainer.appendChild(searchItem);
      
      // Add click event to toggle details section
      searchHeader.addEventListener('click', () => {
        const detailsElement = document.getElementById(`search-details-${index}`);
        detailsElement.classList.toggle('expanded');
      });
    });
  });
}

// Clear all history data
function clearAllHistory() {
  if (confirm('Are you sure you want to clear all search history?')) {
    chrome.storage.local.set({ searchHistory: [], hashtagResults: {} }, () => {
      loadSearchHistory();
    });
  }
}

// Convert legacy array-based history to new keyed format
function migrateHistoryIfNeeded() {
  chrome.storage.local.get(['historyMigrated', 'detailedSearchHistory', 'searchHistory', 'hashtagResults'], (data) => {
    if (data.historyMigrated) return;

    let history = data.searchHistory || [];
    let results = data.hashtagResults || {};
    const legacy = data.detailedSearchHistory || [];

    legacy.forEach(item => {
      const timestamp = item.timestamp || new Date().toISOString();
      const hashtags = [];
      if (Array.isArray(item.hashtags)) {
        item.hashtags.forEach(tagObj => {
          const name = (tagObj.hashtag || tagObj).toLowerCase();
          hashtags.push(name);
          results[name] = { followers: tagObj.followers || null, lastChecked: tagObj.date || timestamp };
        });
      }

      const suggestions = (item.suggestedHashtags || []).map(s => (s.hashtag || s).toLowerCase());

      history.push({ query: item.query, hashtags, timestamp, suggestedHashtags: suggestions });
    });

    chrome.storage.local.set({
      searchHistory: history,
      hashtagResults: results,
      historyMigrated: true,
      detailedSearchHistory: []
    });
  });
}