// LinkedIn Auto Commenter Statistics
(function() {
  // Initialize statistics
  let commentStats = {
    totalComments: 0,
    successfulComments: 0,
    failedComments: 0,
    lastCommented: null,
    commentedPosts: [],
    tokenUsage: 0
  };
  
  // Load statistics from storage
  function loadStats() {
    chrome.storage.local.get(['commentStats'], (result) => {
      if (result.commentStats) {
        commentStats = result.commentStats;
        console.log('Comment statistics loaded');
      }
    });
  }
  
  // Save statistics to storage
  function saveStats() {
    chrome.storage.local.set({ commentStats: commentStats }, () => {
      console.log('Comment statistics saved');
    });
  }
  
  // Record a successful comment
  function recordComment(postInfo, comment, tokenCount) {
    commentStats.totalComments++;
    commentStats.successfulComments++;
    commentStats.lastCommented = new Date().toISOString();
    commentStats.tokenUsage += (tokenCount || 0);
    
    // Keep record of commented posts (limit to last 50)
    commentStats.commentedPosts.unshift({
      author: postInfo.author,
      title: postInfo.title,
      commentDate: new Date().toISOString(),
      commentExcerpt: comment.substring(0, 100) + (comment.length > 100 ? '...' : ''),
      tokenCount: tokenCount || 0
    });
    
    // Limit the history to 50 items
    if (commentStats.commentedPosts.length > 50) {
      commentStats.commentedPosts = commentStats.commentedPosts.slice(0, 50);
    }
    
    // Save updated stats
    saveStats();
  }
  
  // Record a failed comment
  function recordFailure() {
    commentStats.totalComments++;
    commentStats.failedComments++;
    saveStats();
  }
  
  // Get comment statistics
  function getStats() {
    return { ...commentStats };
  }
  
  // Reset statistics
  function resetStats() {
    commentStats = {
      totalComments: 0,
      successfulComments: 0,
      failedComments: 0,
      lastCommented: null,
      commentedPosts: [],
      tokenUsage: 0
    };
    saveStats();
  }
  
  // Initialize stats when loaded
  loadStats();
  
  // Listen for messages from other parts of the extension
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'RECORD_COMMENT') {
      recordComment(message.postInfo, message.comment, message.tokenCount);
      sendResponse({ success: true });
      return true;
    } 
    else if (message.type === 'RECORD_FAILURE') {
      recordFailure();
      sendResponse({ success: true });
      return true;
    }
    else if (message.type === 'GET_COMMENT_STATS') {
      sendResponse({ stats: getStats() });
      return true;
    }
    else if (message.type === 'RESET_COMMENT_STATS') {
      resetStats();
      sendResponse({ success: true });
      return true;
    }
  });
  
  // Export functions for use in other scripts
  window.commentStatsManager = {
    recordComment,
    recordFailure,
    getStats,
    resetStats
  };
})();
