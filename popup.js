document.getElementById("checkBtn").addEventListener("click", async () => {
  const input = document.getElementById("hashtags").value;
  if (!input.trim()) return;
  
  // Parse hashtags and clean them
  const hashtags = input.split(",")
    .map(h => h.trim())
    .filter(h => h);
  
  const resultsElement = document.getElementById("results");
  const loadingElement = document.getElementById("loading");
  
  // Clear previous results
  resultsElement.innerHTML = "";
  
  // Show loading indicator
  loadingElement.style.display = "block";
  
  // Track hashtags we're checking and their original capitalization
  const hashtagMap = new Map();
  
  // Process each hashtag
  for (const tag of hashtags) {
    // Skip empty tags
    if (!tag) continue;
    
    // Store original capitalization for display
    hashtagMap.set(tag.toLowerCase(), tag);
    
    // Create a background tab to fetch the data
    chrome.tabs.create({
      url: `https://www.linkedin.com/feed/hashtag/${encodeURIComponent(tag)}`,
      active: false // Keep the tab in the background
    }, (tab) => {
      // Create a row for this hashtag
      const row = document.createElement("tr");
      const hashtagCell = document.createElement("td");
      const followersCell = document.createElement("td");
      
      // Set data attributes to help with matching
      hashtagCell.textContent = `#${tag}`;
      hashtagCell.dataset.hashtag = tag.toLowerCase();
      followersCell.textContent = "Loading...";
      
      row.appendChild(hashtagCell);
      row.appendChild(followersCell);
      resultsElement.appendChild(row);
    });
  }
});

// When content script sends back follower count
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "HASHTAG_FOLLOWERS") {
    const loadingElement = document.getElementById("loading");
    
    // Clean up and normalize hashtag for matching
    const receivedHashtag = (message.hashtag || "").toLowerCase();
    
    // Find the row for this hashtag
    const rows = document.querySelectorAll("#results tr");
    let matchedRow = null;
    
    rows.forEach(row => {
      const hashtagCell = row.querySelector("td[data-hashtag]");
      if (hashtagCell) {
        const storedTag = hashtagCell.dataset.hashtag.toLowerCase();
        
        // Try different matching approaches
        if (storedTag === receivedHashtag || 
            receivedHashtag.includes(storedTag) || 
            storedTag.includes(receivedHashtag)) {
          matchedRow = row;
        }
      }
    });
    
    if (matchedRow) {
      // Found a matching row, update the follower count
      const followersCell = matchedRow.cells[1];
      if (followersCell) {
        followersCell.textContent = message.followers;
      }
    } else {
      console.log("No matching row found for hashtag:", message.hashtag);
    }
    
    // Close the tab after we've processed the data
    if (sender.tab) {
      chrome.tabs.remove(sender.tab.id);
    }
    
    // Check if all results are in
    const allLoaded = Array.from(rows).every(row => 
      row.cells[1] && row.cells[1].textContent !== "Loading..."
    );
    
    if (allLoaded) {
      // Hide loading message
      loadingElement.style.display = "none";
    }
  } else if (message.type === "CLOSE_TAB" && sender.tab) {
    chrome.tabs.remove(sender.tab.id);
  }
});
