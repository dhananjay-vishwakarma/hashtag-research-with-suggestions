// Script to handle the comment statistics page
document.addEventListener('DOMContentLoaded', () => {
  // Load comment statistics
  loadCommentStats();
  
  // Set up button event listeners
  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'popup.html';
  });
  
  document.getElementById('refreshBtn').addEventListener('click', loadCommentStats);
  
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all comment statistics?')) {
      chrome.runtime.sendMessage({
        type: 'RESET_COMMENT_STATS'
      }, () => {
        loadCommentStats();
      });
    }
  });
});

// Load and display comment statistics
function loadCommentStats() {
  chrome.runtime.sendMessage({
    type: 'GET_COMMENT_STATS'
  }, (response) => {
    if (response && response.stats) {
      displayStats(response.stats);
      displayCommentHistory(response.stats.commentedPosts);
    }
  });
}

// Display the main statistics
function displayStats(stats) {
  document.getElementById('totalComments').textContent = stats.totalComments || 0;
  document.getElementById('successfulComments').textContent = stats.successfulComments || 0;
  document.getElementById('failedComments').textContent = stats.failedComments || 0;
  
  // Calculate success rate
  const successRate = stats.totalComments > 0 
    ? Math.round((stats.successfulComments / stats.totalComments) * 100) 
    : 0;
  document.getElementById('successRate').textContent = `${successRate}%`;
  
  // Display token usage
  document.getElementById('tokenUsage').textContent = stats.tokenUsage || 0;
  
  // Display last comment date
  if (stats.lastCommented) {
    const lastDate = new Date(stats.lastCommented);
    document.getElementById('lastCommented').textContent = formatDate(lastDate);
  } else {
    document.getElementById('lastCommented').textContent = 'Never';
  }
}

// Display comment history
function displayCommentHistory(comments) {
  const historyContainer = document.getElementById('commentHistory');
  const emptyState = document.getElementById('emptyState');
  
  // Clear previous content
  historyContainer.innerHTML = '';
  
  if (!comments || comments.length === 0) {
    // Show empty state
    historyContainer.appendChild(emptyState);
    return;
  }
  
  // Add comment items
  comments.forEach(comment => {
    const commentItem = document.createElement('div');
    commentItem.className = 'comment-item';
    
    const commentHeader = document.createElement('div');
    commentHeader.className = 'comment-header';
    
    const authorSpan = document.createElement('span');
    authorSpan.className = 'comment-author';
    authorSpan.textContent = `${comment.author} (${comment.title || 'LinkedIn Member'})`;
    
    const dateSpan = document.createElement('span');
    dateSpan.className = 'comment-date';
    dateSpan.textContent = formatDate(new Date(comment.commentDate));
    
    commentHeader.appendChild(authorSpan);
    commentHeader.appendChild(dateSpan);
    
    const commentText = document.createElement('div');
    commentText.className = 'comment-text';
    commentText.textContent = comment.commentExcerpt || 'No comment text available';
    
    const tokenInfo = document.createElement('div');
    tokenInfo.className = 'token-info';
    tokenInfo.textContent = `${comment.tokenCount || 0} tokens used`;
    
    commentItem.appendChild(commentHeader);
    commentItem.appendChild(commentText);
    commentItem.appendChild(tokenInfo);
    
    historyContainer.appendChild(commentItem);
  });
}

// Helper function to format dates
function formatDate(date) {
  const now = new Date();
  const diffInMs = now - date;
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInMins < 60) {
    return diffInMins === 1 ? '1 minute ago' : `${diffInMins} minutes ago`;
  } else if (diffInHours < 24) {
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  } else if (diffInDays < 30) {
    return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
  } else {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}
