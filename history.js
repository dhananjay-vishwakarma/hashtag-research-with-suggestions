// Load search history data when the page loads
document.addEventListener('DOMContentLoaded', () => {
  loadSearchHistory();
  
  // Set up event listeners
  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'popup.html';
  });
  
  document.getElementById('clearAllBtn').addEventListener('click', clearAllHistory);
});

// Load search history from local storage
function loadSearchHistory() {
  chrome.storage.local.get(['detailedSearchHistory'], (result) => {
    const historyContainer = document.getElementById('historyContainer');
    const detailedHistory = result.detailedSearchHistory || [];
    
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
          const tagDate = tag.date ? new Date(tag.date).toLocaleDateString() : 'N/A';
          tableContent += `
            <tr>
              <td>#${tag.hashtag}</td>
              <td>${tag.followers || 'Not available'}</td>
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
          suggestionsContent += `
            <div class="suggested-tag">
              #${tag.hashtag} <span class="follower-count">${tag.followers || ''}</span>
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
    chrome.storage.local.set({ 'detailedSearchHistory': [] }, () => {
      loadSearchHistory(); // Reload the page with empty history
    });
  }
}