// Global variable to store hashtag data and suggestions
let hashtagData = [];
let suggestedHashtags = [];
let searchHistory = [];
let isSearchInProgress = false;

// Concurrency control for opening tabs
const MAX_CONCURRENT_TABS = 5;
let pendingHashtags = [];
let activeTabCount = 0;

function processNextHashtag() {
  if (activeTabCount >= MAX_CONCURRENT_TABS) return;
  const tag = pendingHashtags.shift();
  if (!tag) return;

  activeTabCount++;

  chrome.tabs.create({
    url: `https://www.linkedin.com/feed/hashtag/${encodeURIComponent(tag)}`,
    active: false
  });
}

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
    
  // Set a safety timeout to generate suggestions even if some tabs fail to load
  // This ensures we combine whatever hashtag suggestions we have after 30 seconds
  if (window.suggestionTimeoutId) {
    clearTimeout(window.suggestionTimeoutId);
  }
  
  window.suggestionTimeoutId = setTimeout(() => {
    const loadingElement = document.getElementById("loading");
    const suggestionsLoadingElement = document.getElementById("suggestionsLoading");
    
    // If we're still loading, force completion
    if (isSearchInProgress) {
      console.log("Safety timeout triggered - generating suggestions with available data");
      loadingElement.style.display = "none";
      
      // Generate suggestions with whatever data we have
      generateSuggestions();
      
      // Reset search flag
      isSearchInProgress = false;
      
      // Mark any remaining "Loading..." cells as failed
      const rows = document.querySelectorAll("#results tr");
      rows.forEach(row => {
        const followersCell = row.cells[1];
        if (followersCell && followersCell.textContent === "Loading...") {
          followersCell.textContent = "Failed to load";
          followersCell.style.color = "#d32f2f";
        }
      });
      
      // Save to history
      const input = document.getElementById("hashtags").value;
      const hashtags = input.split(",").map(h => h.trim()).filter(h => h);
      saveDetailedHistory(input, hashtags);
    }
  }, 30000); // 30 seconds timeout
  
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

  // Initialize queue
  pendingHashtags = [];
  activeTabCount = 0;

  for (const tag of hashtags) {
    if (!tag) continue;
    pendingHashtags.push(tag);

    // Create a placeholder row for this hashtag
    const row = document.createElement("tr");
    const hashtagCell = document.createElement("td");
    const followersCell = document.createElement("td");

    hashtagCell.textContent = `#${tag}`;
    hashtagCell.dataset.hashtag = tag.toLowerCase();
    followersCell.textContent = "Loading...";

    row.appendChild(hashtagCell);
    row.appendChild(followersCell);
    resultsElement.appendChild(row);
  }

  // Kick off processing
  for (let i = 0; i < MAX_CONCURRENT_TABS; i++) {
    processNextHashtag();
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
    activeTabCount = Math.max(0, activeTabCount - 1);
    processNextHashtag();
    
    // Check if all results are in
    const allLoaded = Array.from(rows).every(row => 
      row.cells[1] && row.cells[1].textContent !== "Loading..."
    );
    
    // When all hashtags are processed, or after a timeout as a safety measure
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
      
      // Clear any pending safety timeout
      if (window.suggestionTimeoutId) {
        clearTimeout(window.suggestionTimeoutId);
        window.suggestionTimeoutId = null;
      }
    }
  } else if (message.type === "CLOSE_TAB" && sender.tab) {
    chrome.tabs.remove(sender.tab.id);
    activeTabCount = Math.max(0, activeTabCount - 1);
    processNextHashtag();
  }
});

// Function to generate and display hashtag suggestions with improved logic for multiple hashtags
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
  let sourceHashtags = {};
  
  // Process each hashtag and its suggestions
  hashtagData.forEach(data => {
    if (data.relatedHashtags && data.relatedHashtags.length > 0) {
      // Store original hashtag as source for these related tags
      const sourceTag = data.hashtag.toLowerCase();
      console.log(`Found ${data.relatedHashtags.length} related hashtags for #${sourceTag}`);
      
      // Process each related hashtag
      data.relatedHashtags.forEach(relatedTag => {
        // Skip if the tag object is invalid
        if (!relatedTag || !relatedTag.hashtag) return;
        
        // Track which source hashtags suggested this tag
        const tagName = relatedTag.hashtag.toLowerCase();
        if (!sourceHashtags[tagName]) {
          sourceHashtags[tagName] = new Set();
        }
        sourceHashtags[tagName].add(sourceTag);
        
        // Add to our full collection
        allRelatedTags.push(relatedTag);
      });
    }
  });
  
  console.log(`Total related hashtags collected: ${allRelatedTags.length}`);
  console.log(`Unique related hashtags: ${Object.keys(sourceHashtags).length}`);
  
  // If we don't have any related hashtags, show message
  if (allRelatedTags.length === 0) {
    suggestionsLoadingElement.style.display = "none";
    suggestionsElement.innerHTML = "<p>No related hashtags found. Try refreshing or searching for different hashtags.</p>";
    return;
  }
  
  // Count occurrences of each hashtag (relevance) and get follower counts
  const tagCounts = {};
  const tagFollowers = {};
  const tagSourcesInfo = {}; // Track which hashtags had this as related
  
  allRelatedTags.forEach(tag => {
    if (!tag || !tag.hashtag) return; // Skip invalid tags
    
    const tagName = tag.hashtag.toLowerCase();
    tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
    
    // If we have follower count info, store the highest count
    if (tag.followers) {
      // Convert follower count to number for comparison
      const followersNum = parseFollowerCount(tag.followers);
      if (!tagFollowers[tagName] || followersNum > tagFollowers[tagName]) {
        tagFollowers[tagName] = followersNum;
      }
    }
    
    // Track if this is a fallback suggestion
    if (tag.isFallback) {
      tagSourcesInfo[tagName] = 'fallback';
    }
  });
  
  console.log(`Unique hashtags to evaluate: ${Object.keys(tagCounts).length}`);
  
  // Create a scoring system based on relevance, follower count and source diversity
  // Convert to array for sorting
  const scoredTags = Object.keys(tagCounts).map(tag => {
    // Relevance score (how many times this tag appeared in related tags)
    const relevanceScore = tagCounts[tag];
    
    // Source diversity score (how many different input hashtags suggested this tag)
    const sourceCount = sourceHashtags[tag] ? sourceHashtags[tag].size : 0;
    const sourceDiversityScore = sourceCount / Math.max(1, hashtagData.length) * 100;
    
    // Follower score
    const followerCount = tagFollowers[tag] || 0;
    const followerScore = followerCount;
    
    // Combined score with weighted priority to source diversity for multiple hashtags
    // For multiple hashtags, we prioritize tags that appear across multiple sources
    const isMultipleHashtags = hashtagData.length > 1;
    
    // Adjust weights based on number of hashtags being researched
    const diversityWeight = isMultipleHashtags ? 0.35 : 0.2;
    const followerWeight = isMultipleHashtags ? 0.5 : 0.6;
    const relevanceWeight = isMultipleHashtags ? 0.15 : 0.2;
    
    // Combined score with adjusted weights
    const totalScore = (followerScore * followerWeight) + 
                       (relevanceScore * relevanceWeight) + 
                       (sourceDiversityScore * diversityWeight);
    
    // Fallback tags get lower priority unless they have very high follower counts
    const isFallback = tagSourcesInfo[tag] === 'fallback';
    const adjustedScore = isFallback ? (totalScore * 0.8) : totalScore;
    
    return {
      hashtag: tag,
      score: adjustedScore,
      followers: formatFollowerCount(followerCount),
      rawFollowers: followerCount,
      relevance: relevanceScore,
      sourceCount: sourceCount,
      sourceDiversity: sourceDiversityScore,
      isFallback: isFallback
    };
  });
  
  // Sort by total score descending
  scoredTags.sort((a, b) => b.score - a.score);
  
  // For multiple hashtags, prioritize suggestions that appear across multiple sources
  if (hashtagData.length > 1) {
    // Boost tags that appear in multiple sources
    const boostedTags = scoredTags.filter(tag => tag.sourceCount > 1);
    const regularTags = scoredTags.filter(tag => tag.sourceCount <= 1);
    
    // Sort each group by score
    boostedTags.sort((a, b) => b.score - a.score);
    regularTags.sort((a, b) => b.score - a.score);
    
    // Combine the lists, putting boosted tags first
    suggestedHashtags = [...boostedTags, ...regularTags].slice(0, 15);
  } else {
    // For single hashtag, use the normal scoring
    suggestedHashtags = scoredTags.slice(0, 15);
  }
  
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
  
  // If using multiple hashtags, add a note about source count
  if (hashtagData.length > 1) {
    const noteElement = document.createElement("p");
    noteElement.className = "suggestion-note";
    noteElement.innerHTML = "<small>✓ numbers indicate how many of your hashtags recommended this suggestion</small>";
    noteElement.style.marginTop = "15px";
    noteElement.style.color = "#666";
    suggestionsElement.appendChild(noteElement);
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
    
    // Style based on source diversity (more sources = higher confidence)
    if (suggestion.sourceCount > 1) {
      // Higher confidence (found in multiple source hashtags)
      const confidence = Math.min(100, (suggestion.sourceCount / hashtagData.length) * 100);
      // Make color more intense for higher source counts
      const blueIntensity = Math.max(180, 230 - (confidence * 0.6)); 
      suggestionElem.style.backgroundColor = `rgb(190, ${blueIntensity}, 255)`;
      suggestionElem.style.borderColor = `rgb(160, ${blueIntensity - 30}, 240)`;
      // Add a slight border glow effect for multiple sources
      suggestionElem.style.boxShadow = `0 0 3px rgba(120, 120, 255, 0.${Math.min(9, suggestion.sourceCount * 2)})`;
    } else if (suggestion.isFallback) {
      // Fallback suggestion
      suggestionElem.classList.add("fallback-suggestion");
      suggestionElem.style.backgroundColor = "#f5f5f5";
      suggestionElem.style.borderColor = "#e0e0e0";
    }
    
    // Display hashtag name and follower count
    suggestionElem.innerHTML = `#${suggestion.hashtag} <span class="follower-count">${suggestion.followers}</span>`;
    
    // Add source count as a badge for multiple sources
    if (suggestion.sourceCount > 1) {
      const sourceIcon = document.createElement("span");
      sourceIcon.className = "source-badge";
      sourceIcon.title = `Found in ${suggestion.sourceCount} of your hashtags`;
      sourceIcon.textContent = `${suggestion.sourceCount}✓`;
      
      // Style based on number of sources
      const badgeColor = suggestion.sourceCount >= hashtagData.length ? "#2e7d32" : // All sources
                         suggestion.sourceCount >= hashtagData.length * 0.5 ? "#4caf50" : // More than half
                         "#81c784"; // Less than half
                         
      sourceIcon.style.backgroundColor = badgeColor;
      sourceIcon.style.color = "white";
      sourceIcon.style.borderRadius = "50%";
      sourceIcon.style.padding = "2px 4px";
      sourceIcon.style.marginLeft = "5px";
      sourceIcon.style.fontSize = "0.75em";
      sourceIcon.style.fontWeight = "bold";
      suggestionElem.appendChild(sourceIcon);
    }
    
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

// Tab switching functionality
document.addEventListener('DOMContentLoaded', () => {
  // Set up tab switching
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Hide all tab content
      const tabContents = document.querySelectorAll('.tab-content');
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Show selected tab content
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(`${tabId}-content`).classList.add('active');
    });
  });
  
  // Auto Commenter Settings
  loadAutoCommenterSettings();
  
  document.getElementById('saveAutoCommenterSettings').addEventListener('click', saveAutoCommenterSettings);
});

// Load Auto Commenter settings
function loadAutoCommenterSettings() {
  chrome.storage.local.get(['autoCommenterConfig'], (result) => {
    if (result.autoCommenterConfig) {
      const config = result.autoCommenterConfig;
      document.getElementById('apiKey').value = config.apiKey || '';
      document.getElementById('userSignature').value = config.userSignature || '';
      document.getElementById('commentPrompt').value = config.commentPrompt || 'Write a professional, thoughtful, and concise comment (maximum 100 words) in response to this LinkedIn post:';
      document.getElementById('modelSelect').value = config.model || 'gpt-3.5-turbo';
      document.getElementById('commentFrequency').value = config.commentFrequency || '50';
      document.getElementById('enableAutoCommenter').checked = config.enabled || false;
    }
  });
}

// Save Auto Commenter settings
function saveAutoCommenterSettings() {
  const config = {
    apiKey: document.getElementById('apiKey').value,
    userSignature: document.getElementById('userSignature').value,
    commentPrompt: document.getElementById('commentPrompt').value,
    model: document.getElementById('modelSelect').value,
    commentFrequency: document.getElementById('commentFrequency').value,
    enabled: document.getElementById('enableAutoCommenter').checked,
    temperature: 0.7,
    maxTokens: 150,
    processingDelay: 2000,
    debugMode: false
  };
  
  chrome.storage.local.set({ autoCommenterConfig: config }, () => {
    alert('Auto Commenter settings saved!');
  });
}
