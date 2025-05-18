// Module for tracking LinkedIn post engagement patterns
(function() {
  // Track engagement patterns to optimize targeting
  function trackEngagementPatterns() {
    try {
      // Get posts we've commented on that have 'data-auto-commented="true"'
      const commentedPosts = Array.from(document.querySelectorAll('[data-auto-commented="true"]'));
      
      if (commentedPosts.length === 0) return;
      
      // Initialize engagement data structure if not exists
      chrome.storage.local.get(['engagementPatterns'], (result) => {
        let patterns = result.engagementPatterns || {
          postTypes: {
            question: { count: 0, avgEngagement: 0 },
            celebration: { count: 0, avgEngagement: 0 },
            article: { count: 0, avgEngagement: 0 },
            poll: { count: 0, avgEngagement: 0 },
            update: { count: 0, avgEngagement: 0 }
          },
          connectionLevels: {
            first: { count: 0, avgEngagement: 0 },
            second: { count: 0, avgEngagement: 0 },
            third: { count: 0, avgEngagement: 0 },
            other: { count: 0, avgEngagement: 0 }
          },
          totalPostsAnalyzed: 0
        };
        
        // For each post we've commented on, check current engagement
        commentedPosts.forEach(post => {
          // Extract engagement metrics
          const reactions = post.querySelector('.social-details-social-counts__reactions-count');
          const comments = post.querySelector('.social-details-social-counts__comments');
          
          let engagementScore = 0;
          
          if (reactions) {
            const reactionsText = reactions.textContent.trim();
            const reactionsMatch = reactionsText.match(/(\d+)/);
            if (reactionsMatch) {
              engagementScore += parseInt(reactionsMatch[1], 10);
            }
          }
          
          if (comments) {
            const commentsText = comments.textContent.trim();
            const commentsMatch = commentsText.match(/(\d+)/);
            if (commentsMatch) {
              engagementScore += parseInt(commentsMatch[1], 10) * 2; // Comments worth more
            }
          }
          
          // Determine post type
          let postType = 'update'; // Default
          const postText = extractPostCaption(post) || '';
          
          if (postText.includes('?')) {
            postType = 'question';
          } else if (/new job|anniversary|birthday|joined|promoted|congratulations|congrats/i.test(postText)) {
            postType = 'celebration';
          } else if (post.querySelector('.feed-shared-article') !== null) {
            postType = 'article';
          } else if (post.querySelector('.feed-shared-poll, .poll-component') !== null) {
            postType = 'poll';
          }
          
          // Determine connection level
          let connectionLevel = 'other'; // Default
          const connectionIndicator = post.querySelector('.feed-shared-actor__sub-description, .update-components-actor__description');
          
          if (connectionIndicator) {
            const connectionText = connectionIndicator.textContent.toLowerCase();
            if (connectionText.includes('1st') || connectionText.includes('following')) {
              connectionLevel = 'first';
            } else if (connectionText.includes('2nd')) {
              connectionLevel = 'second';
            } else if (connectionText.includes('3rd')) {
              connectionLevel = 'third';
            }
          }
          
          // Update patterns based on engagement
          if (patterns.postTypes[postType]) {
            const currentData = patterns.postTypes[postType];
            patterns.postTypes[postType] = {
              count: currentData.count + 1,
              avgEngagement: (currentData.avgEngagement * currentData.count + engagementScore) / (currentData.count + 1)
            };
          }
          
          if (patterns.connectionLevels[connectionLevel]) {
            const currentData = patterns.connectionLevels[connectionLevel];
            patterns.connectionLevels[connectionLevel] = {
              count: currentData.count + 1,
              avgEngagement: (currentData.avgEngagement * currentData.count + engagementScore) / (currentData.count + 1)
            };
          }
          
          patterns.totalPostsAnalyzed++;
        });
        
        // Save updated patterns
        chrome.storage.local.set({ engagementPatterns: patterns }, () => {
          console.log('Engagement patterns updated:', patterns);
        });
      });
    } catch (error) {
      console.error('Error tracking engagement patterns:', error);
    }
  }
  
  // Export the function for use in the main script
  window.engagementTracker = {
    trackEngagementPatterns: trackEngagementPatterns
  };
})();
