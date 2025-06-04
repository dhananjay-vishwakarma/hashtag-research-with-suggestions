(function(global){
  const cfg = () => global.autoCommenterConfig || {};

  // Validate OpenAI API key format
  function isValidOpenAIApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') return false;
    const commonPasswordPatterns = [
      /^password/i,
      /^pass/i,
      /^\d{1,8}$/,
      /^[a-z0-9]{1,10}[@#$%^&*]/i,
      /^admin/i,
      /^test/i
    ];
    for (const pattern of commonPasswordPatterns) {
      if (pattern.test(apiKey)) return false;
    }
    const openAIPattern = /^sk-[a-zA-Z0-9]{48,}$/;
    return openAIPattern.test(apiKey);
  }

  // Simple API key validation request
  async function testApiKey(key){
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      if(!res.ok) return { valid:false, error:`HTTP ${res.status}` };
      return { valid:true };
    }catch(err){
      return { valid:false, error:err.message };
    }
  }

  // Generate comment via OpenAI API
  async function generateCommentWithAI(authorInfo, postCaption, postElement){
    const config = cfg();
    try {
      if(!config.apiKey){
        global.autoCommenterStatus?.log('ERROR','OpenAI API key is not set');
        return null;
      }
      if(!isValidOpenAIApiKey(config.apiKey)){
        const msg='Invalid OpenAI API key format';
        global.autoCommenterStatus?.log('ERROR',`${msg}. Please check your API key in the Auto Commenter settings.`);
        return null;
      }
      const postEvaluation = global.evaluatePostWorth?.({querySelector:()=>null}) || {score:0,reason:''};
      let visualContentDescription = '';
      global.autoCommenterStatus?.setOperation('PROCESSING','Analyzing visual content in post...');
      if(global.contentAnalyzer && postElement){
        const isVisual = global.contentAnalyzer.isVisualContentPost(postElement);
        if(isVisual){
          visualContentDescription = await global.contentAnalyzer.getVisualContentDescription(postElement);
          if(visualContentDescription){
            global.autoCommenterStatus?.log('INFO',`Visual content detected: ${visualContentDescription.substring(0,50)}...`);
          }
        }
      }
      global.autoCommenterStatus?.setOperation('PROCESSING','Sending request to OpenAI API...');
      const prompt = `${config.commentPrompt}
\nPost by ${authorInfo.name} (${authorInfo.title}):\n"${postCaption}"\n\n${visualContentDescription ? `Visual content in post: ${visualContentDescription}\n\n` : ''}Write a thoughtful, professional comment that is relevant to the post content.\nKeep it concise (max 100 words) and conversational.\nDo not use hashtags or emojis.\n\nAdditional context about this post:\n- This post was evaluated as worth commenting on (score: ${postEvaluation.score}/100)\n- Reasons to engage: ${postEvaluation.reason || 'Content appears relevant and valuable'}`;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${config.apiKey}`},
        body:JSON.stringify({
          model:config.model,
          messages:[{role:'system',content:'You are a professional LinkedIn user writing thoughtful comments on posts.'},{role:'user',content:prompt}],
          max_tokens:config.maxTokens,
          temperature:config.temperature
        })
      });
      global.autoCommenterStatus?.setOperation('PROCESSING','Receiving AI response...');
      const data = await response.json();
      if(!response.ok){
        let errorMessage = data.error?.message || data.error?.type || `HTTP error ${response.status}`;
        if(response.status===401) errorMessage = 'API key authentication failed. Please check your OpenAI API key in the settings.';
        else if(response.status===429) errorMessage = 'Rate limit exceeded or insufficient quota. Check your OpenAI billing status.';
        else if(response.status===404) errorMessage = `Model "${config.model}" not found. It may be deprecated or not available in your account.`;
        else if(response.status>=500) errorMessage = 'OpenAI server error. Please try again later.';
        global.autoCommenterStatus?.log('ERROR',`OpenAI API error: ${errorMessage}`);
        chrome.runtime.sendMessage({type:'RECORD_FAILURE', error:errorMessage});
        return null;
      }
      if(data.error){
        global.autoCommenterStatus?.log('ERROR',`OpenAI API error: ${data.error.message || data.error.type}`);
        chrome.runtime.sendMessage({type:'RECORD_FAILURE', error:data.error.message || data.error.type});
        return null;
      }
      if(!data.choices || !data.choices[0] || !data.choices[0].message){
        global.autoCommenterStatus?.log('ERROR','Invalid response format from OpenAI API');
        return null;
      }
      let comment = data.choices[0].message.content.trim();
      if(config.userSignature){
        comment += `\n\n${config.userSignature}`;
      }
      let tokenUsage = 0;
      if(data.usage && data.usage.total_tokens){
        tokenUsage = data.usage.total_tokens;
        global.autoCommenterStatus?.log('INFO',`Generated comment using ${tokenUsage} tokens`);
      }
      global.autoCommenterStatus?.setOperation('SUCCESS','Comment generated successfully').autoHide?.();
      return { text: comment, tokenUsage };
    }catch(error){
      global.autoCommenterStatus?.log('ERROR',`Error generating comment: ${error.message}`);
      return null;
    }
  }

  global.AutoCommenterAPI = { generateCommentWithAI, isValidOpenAIApiKey, testApiKey };
})(window);
