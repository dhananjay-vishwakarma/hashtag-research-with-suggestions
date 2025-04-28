// Global variable to store hashtag data and suggestions
let hashtagData = [];
let suggestedHashtags = [];
let searchHistory = [];
let isSearchInProgress = false;

// Load saved data when popup opens
document.addEventListener('DOMContentLoaded', () => {
  loadSavedData();
  
  // Add history button navigation
  document.getElementById('historyBtn').addEventListener('click', () => {
    window.location.href = 'history.html';
  });
});

// Load data from local storage
function loadSavedData() {
  chrome.storage.local.get(['hashtagData', 'suggestedHashtags', 'searchHistory'], (result) => {
    if (result.hashtagData) hashtagData = result.hashtagData;
    if (result.suggestedHashtags) suggestedHashtags = result.suggestedHashtags;
    if (result.searchHistory) searchHistory = result.searchHistory;
    
    // If we have hashtag data, also display the results and suggestions
    if (hashtagData.length > 0) {
      displayStoredResults();
      generateSuggestions();
    }
  });
}

// Save data to local storage
function saveDataToLocalStorage() {
  chrome.storage.local.set({
    hashtagData: hashtagData,
    suggestedHashtags: suggestedHashtags,
    searchHistory: searchHistory
  }, () => {
    console.log('Data saved to local storage');
  });
}

// Save detailed search history with hashtags, dates, and suggestions
function saveDetailedHistory(query, hashtags) {
  chrome.storage.local.get(['detailedSearchHistory'], (result) => {
    let detailedHistory = result.detailedSearchHistory || [];
    
    // Create new history item with current date and hashtag data
    const historyItem = {
      query: query,
      timestamp: new Date().toISOString(),
      hashtags: hashtags.map(hash => {
        const matchingData = hashtagData.find(h => h.hashtag.toLowerCase() === hash.toLowerCase());
        return {
          hashtag: hash,
          followers: matchingData ? matchingData.followers : null,
          date: new Date().toISOString()
        };
      }),
      suggestedHashtags: suggestedHashtags.slice(0, 15) // Store top 15 suggestions
    };
    
    // Add to history (avoid duplicates with same timestamp)
    if (!detailedHistory.some(item => item.timestamp === historyItem.timestamp)) {
      detailedHistory.unshift(historyItem);
      
      // Limit history to 50 entries
      if (detailedHistory.length > 50) {
        detailedHistory = detailedHistory.slice(0, 50);
      }
      
      // Save updated history
      chrome.storage.local.set({ 'detailedSearchHistory': detailedHistory }, () => {
        console.log('Detailed history saved');
      });
    }
  });
}

document.getElementById("checkBtn").addEventListener("click", async () => {
  // Prevent multiple clicks while a search is in progress
  if (isSearchInProgress) {
    console.log('Search already in progress. Please wait...');
    return;
  }
  
  const input = document.getElementById("hashtags").value;
  if (!input.trim()) return;
  
  // Set flag to prevent multiple searches
  isSearchInProgress = true;
  
  // Parse hashtags and clean them
  const hashtags = input.split(",")
    .map(h => h.trim())
    .filter(h => h);
  
  // Add search to history
  const searchItem = {
    query: input,
    hashtags: hashtags,
    timestamp: new Date().toISOString()
  };
  
  // Add to history (avoid duplicates)
  if (!searchHistory.some(item => item.query === input)) {
    searchHistory.unshift(searchItem); // Add to beginning of array
    if (searchHistory.length > 20) searchHistory.pop(); // Limit history to 20 entries
    saveDataToLocalStorage();
  }
  
  const resultsElement = document.getElementById("results");
  const loadingElement = document.getElementById("loading");
  const suggestionsElement = document.getElementById("suggestions");
  const suggestionsLoadingElement = document.getElementById("suggestionsLoading");
  
  // Clear previous results
  resultsElement.innerHTML = "";
  suggestionsElement.innerHTML = "";
  hashtagData = [];
  
  // Show loading indicators
  loadingElement.style.display = "block";
  suggestionsLoadingElement.style.display = "block";
  
  // Track hashtags we're checking and their original capitalization
  const hashtagMap = new Map();
  
  // Track how many hashtags we're processing
  const totalHashtags = hashtags.length;
  let processedHashtags = 0;
  
  // Process each hashtag
  for (const tag of hashtags) {
    // Skip empty tags
    if (!tag) {
      processedHashtags++;
      continue;
    }
    
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

// Display stored results without making new requests
function displayStoredResults() {
  const resultsElement = document.getElementById("results");
  resultsElement.innerHTML = "";
  
  // Display each hashtag and its follower count
  hashtagData.forEach(data => {
    const row = document.createElement("tr");
    const hashtagCell = document.createElement("td");
    const followersCell = document.createElement("td");
    
    hashtagCell.textContent = `#${data.hashtag}`;
    hashtagCell.dataset.hashtag = data.hashtag.toLowerCase();
    followersCell.textContent = data.followers || "Unknown";
    
    row.appendChild(hashtagCell);
    row.appendChild(followersCell);
    resultsElement.appendChild(row);
  });
}

// When content script sends back follower count and related hashtags
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "HASHTAG_FOLLOWERS") {
    const loadingElement = document.getElementById("loading");
    const suggestionsLoadingElement = document.getElementById("suggestionsLoading");
    
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
      
      // Add to our global hashtag data
      hashtagData.push({
        hashtag: receivedHashtag,
        followers: message.followers,
        relatedHashtags: message.relatedHashtags || [],
        date: new Date().toISOString()
      });
      
      console.log(`Received ${message.relatedHashtags?.length || 0} related hashtags for #${receivedHashtag}`);
      
      // Save updated data to local storage
      saveDataToLocalStorage();
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
      
      // Generate suggestions based on collected data
      generateSuggestions();
      
      // Reset search flag
      isSearchInProgress = false;
      
      // Save detailed search history with hashtag data and suggestions
      const input = document.getElementById("hashtags").value;
      const hashtags = input.split(",").map(h => h.trim()).filter(h => h);
      saveDetailedHistory(input, hashtags);
    }
  } else if (message.type === "CLOSE_TAB" && sender.tab) {
    chrome.tabs.remove(sender.tab.id);
  }
});

// Function to generate and display hashtag suggestions with improved logic
function generateSuggestions() {
  const suggestionsElement = document.getElementById("suggestions");
  const suggestionsLoadingElement = document.getElementById("suggestionsLoading");
  
  // If we don't have any data yet, return
  if (hashtagData.length === 0) {
    suggestionsLoadingElement.style.display = "none";
    suggestionsElement.innerHTML = "<p>No suggestions available</p>";
    return;
  }
  
  console.log(`Generating suggestions from ${hashtagData.length} hashtags`);
  
  // Extract all related hashtags from our data
  let allRelatedTags = [];
  hashtagData.forEach(data => {
    if (data.relatedHashtags && data.relatedHashtags.length > 0) {
      console.log(`Found ${data.relatedHashtags.length} related hashtags for ${data.hashtag}`);
      allRelatedTags = allRelatedTags.concat(data.relatedHashtags);
    }
  });
  
  console.log(`Total related hashtags collected: ${allRelatedTags.length}`);
  
  // If we don't have any related hashtags, show message
  if (allRelatedTags.length === 0) {
    suggestionsLoadingElement.style.display = "none";
    suggestionsElement.innerHTML = "<p>No related hashtags found. Try refreshing or searching for different hashtags.</p>";
    return;
  }
  
  // Count occurrences of each hashtag (relevance) and get follower counts
  const tagCounts = {};
  const tagFollowers = {};
  const tagSources = {}; // Track which hashtags had this as related
  
  allRelatedTags.forEach(tag => {
    if (!tag || !tag.hashtag) return; // Skip invalid tags
    
    const tagName = tag.hashtag.toLowerCase();
    tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
    
    // If we have follower count info, store the highest count
    if (tag.followers) {
      // Convert follower count to number for comparison
      const followersNum = parseFollowerCount(tag.followers);
      tagFollowers[tagName] = Math.max(followersNum, tagFollowers[tagName] || 0);
    }
    
    // Track if this is a fallback suggestion
    if (tag.isFallback) {
      tagSources[tagName] = 'fallback';
    }
  });
  
  console.log(`Unique hashtags to evaluate: ${Object.keys(tagCounts).length}`);
  
  // Create a scoring system based on relevance and follower count
  // Convert to array for sorting
  const scoredTags = Object.keys(tagCounts).map(tag => {
    // Relevance score (how many times this tag appeared in related tags)
    const relevanceScore = tagCounts[tag];
    
    // Follower score (normalized based on highest follower count)
    const followerCount = tagFollowers[tag] || 0;
    const followerScore = followerCount;
    
    // Combined score (70% followers, 30% relevance)
    const totalScore = (followerScore * 0.7) + (relevanceScore * 0.3);
    
    // Fallback tags get lower priority unless they have very high follower counts
    const isFallback = tagSources[tag] === 'fallback';
    const adjustedScore = isFallback ? (totalScore * 0.8) : totalScore;
    
    return {
      hashtag: tag,
      score: adjustedScore,
      followers: formatFollowerCount(followerCount),
      rawFollowers: followerCount,
      relevance: relevanceScore,
      isFallback: isFallback
    };
  });
  
  // Sort by total score descending
  scoredTags.sort((a, b) => b.score - a.score);
  
  // Take top 15 suggestions
  suggestedHashtags = scoredTags.slice(0, 15);
  
  console.log(`Top suggestions: ${suggestedHashtags.map(t => t.hashtag).join(', ')}`);
  
  // Display suggestions
  suggestionsLoadingElement.style.display = "none";
  suggestionsElement.innerHTML = "";
  
  // Group suggestions by follower count ranges for better UX
  const groupedSuggestions = {
    highFollowers: suggestedHashtags.filter(s => s.rawFollowers >= 1000000), // 1M+
    mediumFollowers: suggestedHashtags.filter(s => s.rawFollowers >= 100000 && s.rawFollowers < 1000000), // 100K-1M
    moderateFollowers: suggestedHashtags.filter(s => s.rawFollowers >= 10000 && s.rawFollowers < 100000), // 10K-100K
    lowFollowers: suggestedHashtags.filter(s => s.rawFollowers < 10000 && s.rawFollowers > 0), // <10K
    unknown: suggestedHashtags.filter(s => s.rawFollowers === 0) // Unknown follower count
  };
  
  // Display high follower suggestions first
  if (groupedSuggestions.highFollowers.length > 0) {
    displaySuggestionGroup(suggestionsElement, groupedSuggestions.highFollowers, "High-Impact Hashtags (1M+ followers)");
  }
  
  // Then medium followers
  if (groupedSuggestions.mediumFollowers.length > 0) {
    displaySuggestionGroup(suggestionsElement, groupedSuggestions.mediumFollowers, "Growing Hashtags (100K+ followers)");
  }
  
  // Then moderate followers
  if (groupedSuggestions.moderateFollowers.length > 0) {
    displaySuggestionGroup(suggestionsElement, groupedSuggestions.moderateFollowers, "Moderate Hashtags (10K+ followers)");
  }
  
  // Then low followers
  if (groupedSuggestions.lowFollowers.length > 0) {
    displaySuggestionGroup(suggestionsElement, groupedSuggestions.lowFollowers, "Niche Hashtags");
  }
  
  // Finally unknown
  if (groupedSuggestions.unknown.length > 0 && 
     (groupedSuggestions.highFollowers.length + 
      groupedSuggestions.mediumFollowers.length + 
      groupedSuggestions.moderateFollowers.length +
      groupedSuggestions.lowFollowers.length) < 5) {
    // Only show unknown if we don't have many known follower suggestions
    displaySuggestionGroup(suggestionsElement, groupedSuggestions.unknown, "Other Relevant Hashtags");
  }
  
  if (suggestedHashtags.length === 0) {
    suggestionsElement.innerHTML = "<p>No suggested hashtags found</p>";
  }
  
  // Save suggestions to local storage
  saveDataToLocalStorage();
}

// Helper function to display a group of suggestions with a heading
function displaySuggestionGroup(container, suggestions, title) {
  if (suggestions.length === 0) return;
  
  const groupContainer = document.createElement("div");
  groupContainer.className = "suggestion-group";
  
  const groupTitle = document.createElement("h4");
  groupTitle.textContent = title;
  groupTitle.style.margin = "15px 0 5px 0";
  groupTitle.style.borderBottom = "1px solid #eaeaea";
  groupTitle.style.paddingBottom = "5px";
  groupContainer.appendChild(groupTitle);
  
  const tagsContainer = document.createElement("div");
  tagsContainer.style.display = "flex";
  tagsContainer.style.flexWrap = "wrap";
  
  suggestions.forEach(suggestion => {
    const suggestionElem = document.createElement("div");
    suggestionElem.className = "suggestion-item";
    if (suggestion.isFallback) {
      suggestionElem.classList.add("fallback-suggestion");
      suggestionElem.style.backgroundColor = "#f5f5f5";
      suggestionElem.style.borderColor = "#e0e0e0";
    }
    
    suggestionElem.innerHTML = `#${suggestion.hashtag} <span class="follower-count">${suggestion.followers}</span>`;
    suggestionElem.dataset.hashtag = suggestion.hashtag;
    
    // Add click handler to add this hashtag to the input
    suggestionElem.addEventListener("click", () => {
      const inputElem = document.getElementById("hashtags");
      const currentValue = inputElem.value.trim();
      
      if (currentValue) {
        inputElem.value = `${currentValue}, ${suggestion.hashtag}`;
      } else {
        inputElem.value = suggestion.hashtag;
      }
    });
    
    tagsContainer.appendChild(suggestionElem);
  });
  
  groupContainer.appendChild(tagsContainer);
  container.appendChild(groupContainer);
}

// Helper function to parse follower count from string to number
function parseFollowerCount(followersString) {
  if (!followersString || typeof followersString !== 'string') {
    return 0;
  }
  
  // Extract the number part from the string
  const match = followersString.match(/(\d[\d,.]+)/);
  if (!match) return 0;
  
  let countStr = match[1].replace(/,/g, '');
  
  // Handle M/K suffixes
  if (followersString.includes('M')) {
    return parseFloat(countStr) * 1000000;
  } else if (followersString.includes('K')) {
    return parseFloat(countStr) * 1000;
  } else {
    return parseInt(countStr, 10) || 0;
  }
}

// Helper function to format follower count for display
function formatFollowerCount(count) {
  if (count === 0) {
    return "";
  } else if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M followers`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K followers`;
  } else {
    return `${count} followers`;
  }
}
