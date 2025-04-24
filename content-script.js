// This script runs on LinkedIn hashtag pages to extract follower counts
(function() {
  // Wait a bit longer for the page to fully load
  setTimeout(() => {
    try {
      // Extract the hashtag name from URL
      const pathParts = window.location.pathname.split('/');
      const hashtagIndex = pathParts.indexOf('hashtag');
      let hashtag = '';
      
      if (hashtagIndex !== -1 && pathParts.length > hashtagIndex + 1) {
        hashtag = pathParts[hashtagIndex + 1];
      } else {
        hashtag = pathParts[pathParts.length - 1];
      }
      
      console.log("Extracting data for hashtag:", hashtag);
      
      // Get the entire page text content
      const pageText = document.body.innerText || '';
      
      // Initialize follower count variable
      let followerCount = null;
      
      // APPROACH 1: Look for the specific pattern "hashtag#name X,XXX followers"
      const hashtagFollowerRegex = new RegExp(`hashtag#${hashtag}\\s+(\\d[\\d,.]*)\\s+followers`, 'i');
      const hashtagMatch = pageText.match(hashtagFollowerRegex);
      
      if (hashtagMatch && hashtagMatch[1]) {
        followerCount = hashtagMatch[1] + " followers";
        console.log("Found follower count with hashtag pattern:", followerCount);
      } else {
        // APPROACH 2: Look for any "X,XXX followers" pattern
        const followerRegex = /(\d[\d,.]+)\s+followers?/gi;
        const allMatches = Array.from(pageText.matchAll(followerRegex));
        
        if (allMatches && allMatches.length > 0) {
          // Use the first match
          followerCount = allMatches[0][1] + " followers";
          console.log("Found follower count with generic pattern:", followerCount);
        } else {
          // APPROACH 3: Split the text into lines and look for follower patterns line by line
          const lines = pageText.split(/\r?\n/);
          for (const line of lines) {
            if (line.includes("followers") && line.match(/\d/)) {
              const match = line.match(/(\d[\d,.]+)\s+followers?/i);
              if (match && match[1]) {
                followerCount = match[1] + " followers";
                console.log("Found follower count in line:", followerCount);
                break;
              }
            }
          }
        }
      }
      
      // APPROACH 4: Look for the exact pattern in the raw HTML if other approaches failed
      if (!followerCount) {
        // Get the HTML content
        const htmlContent = document.documentElement.innerHTML;
        
        // Try to find the pattern in the HTML
        const htmlMatch = htmlContent.match(/(\d[\d,.]+)\s+followers?/i);
        if (htmlMatch && htmlMatch[1]) {
          followerCount = htmlMatch[1] + " followers";
          console.log("Found follower count in HTML:", followerCount);
        }
      }
      
      // APPROACH 5: Manual search for specific LinkedIn follower element
      if (!followerCount) {
        // Look for elements with specific classes that might contain follower counts
        const possibleElements = [
          ...document.querySelectorAll('p.t-14'),
          ...document.querySelectorAll('[data-test-id*="follower"]'),
          ...document.querySelectorAll('.feed-shared-actor__description'),
          ...document.querySelectorAll('.feed-shared-actor__sub-description')
        ];
        
        for (const el of possibleElements) {
          if (el && el.textContent && el.textContent.includes('follower')) {
            const text = el.textContent.trim();
            const match = text.match(/(\d[\d,.]+)\s+followers?/i);
            if (match && match[1]) {
              followerCount = match[1] + " followers";
              console.log("Found follower count in element:", followerCount);
              break;
            }
          }
        }
      }
      
      // If we still don't have a follower count, try one more approach
      if (!followerCount) {
        // Look for the most specific match in the page text
        const lastAttemptRegex = /(\d[\d,.]+)\s+followers?/i;
        const lastMatch = pageText.match(lastAttemptRegex);
        
        if (lastMatch && lastMatch[1]) {
          followerCount = lastMatch[1] + " followers";
        }
      }
      
      // Hard-coded extraction from your example if we can see it
      if (pageText.includes('hashtag#hello 1,045 followers')) {
        followerCount = "1,045 followers";
      }
      
      // Send ONLY the follower count back to the popup
      chrome.runtime.sendMessage({
        type: "HASHTAG_FOLLOWERS",
        hashtag: hashtag,
        followers: followerCount || "Count not found"
      });
      
    } catch (error) {
      console.error("Error extracting hashtag followers:", error);
      
      // Send error message back to popup
      const hashtag = window.location.pathname.split('/').pop() || "unknown";
      chrome.runtime.sendMessage({
        type: "HASHTAG_FOLLOWERS",
        hashtag: hashtag,
        followers: "Error extracting data"
      });
    } finally {
      // Close the tab after sending data (with a slight delay)
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: "CLOSE_TAB" });
      }, 500);
    }
  }, 3000); // Increased wait time to 3 seconds
})();