// utils/geminiAPI.js - FIXED STREAMING TIMEOUT ISSUE
import axios from 'axios';
import zlib from 'zlib';

const MODEL_NAME = "gemini-2.0-flash-exp";

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("❌ GEMINI_API_KEY not found in environment variables");
  }
  return key;
};

// ============================================
// STREAMING API CALL - FIXED TIMEOUT HANDLING
// ============================================
export const callGeminiAPIStreaming = async (promptText, onChunk, options = {}) => {
  const { temperature = 0.7, maxRetries = 2 } = options;
  const API_KEY = getApiKey();
  
  if (!API_KEY) {
    throw new Error("API key is missing");
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:streamGenerateContent?alt=sse&key=${API_KEY}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: promptText }],
      },
    ],
    generationConfig: {
      temperature: temperature,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🚀 Streaming attempt ${attempt + 1}/${maxRetries + 1}...`);
      console.log('📝 Prompt length:', promptText.length, 'characters');
      
      const response = await axios.post(API_URL, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'stream',
        timeout: 120000,
        decompress: false,
      });

      console.log('✅ Stream connection established');
      
      let fullText = '';
      let chunkCount = 0;
      let hasReceivedContent = false;
      let lastActivityTime = Date.now();

      const isCompressed = response.headers['content-encoding'] === 'gzip';
      const stream = isCompressed ? response.data.pipe(zlib.createGunzip()) : response.data;

      return new Promise((resolve, reject) => {
        // FIXED: Increased timeout and better activity tracking
        const timeoutId = setInterval(() => {
          const inactiveTime = Date.now() - lastActivityTime;
          if (inactiveTime > 45000 && !hasReceivedContent) {
            console.error('❌ Timeout: No content received after 45 seconds');
            clearInterval(timeoutId);
            stream.destroy();
            reject(new Error('Stream timeout - no content received'));
          }
        }, 5000);

        let buffer = '';

        stream.on('data', (chunk) => {
          try {
            lastActivityTime = Date.now(); // Reset activity timer
            chunkCount++;
            const chunkStr = chunk.toString('utf8');
            
            if (chunkCount === 1) {
              console.log('📦 First chunk received');
            }
            
            buffer += chunkStr;
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';
            
            for (const event of events) {
              if (!event.trim()) continue;
              
              const lines = event.split('\n');
              let jsonData = '';
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  jsonData = line.substring(6).trim();
                  break;
                }
              }
              
              if (!jsonData) continue;
              
              try {
                const parsed = JSON.parse(jsonData);
                
                if (parsed.error) {
                  console.error('❌ API Error:', parsed.error);
                  clearInterval(timeoutId);
                  reject(new Error(parsed.error.message || 'API Error'));
                  return;
                }
                
                if (parsed.candidates?.[0]?.finishReason === 'SAFETY') {
                  console.error('❌ Content blocked by safety filters');
                  clearInterval(timeoutId);
                  reject(new Error('Content was blocked by AI safety filters. Try rephrasing your request.'));
                  return;
                }
                
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                
                // FIXED: Send chunks immediately, even small ones
                if (text !== undefined && text.length > 0) {
                  fullText += text;
                  hasReceivedContent = true;
                  
                  // CRITICAL: Call onChunk IMMEDIATELY for each text piece
                  if (onChunk) {
                    onChunk(text);
                  }
                  
                  // Log every 10 chunks instead of 5 for less noise
                  if (chunkCount % 10 === 0) {
                    console.log(`📊 Progress: ${fullText.length} chars, ${chunkCount} chunks`);
                  }
                } else if (parsed.candidates?.[0]?.finishReason) {
                  console.log('🏁 Stream finish reason:', parsed.candidates[0].finishReason);
                }
                
              } catch (parseError) {
                // Silently continue on parse errors
              }
            }
          } catch (error) {
            console.error('❌ Error processing chunk:', error.message);
          }
        });

        stream.on('end', () => {
          clearInterval(timeoutId);
          
          // Process remaining buffer
          if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonData = line.substring(6).trim();
                try {
                  const parsed = JSON.parse(jsonData);
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    fullText += text;
                    if (onChunk) onChunk(text);
                    hasReceivedContent = true;
                  }
                } catch (e) {
                  // Ignore
                }
              }
            }
          }
          
          console.log(`📊 Stream ended. Total: ${fullText.length} chars`);
          
          if (fullText.length === 0) {
            console.error('❌ Empty response from API');
            
            if (attempt < maxRetries) {
              console.log(`⚠️ Retrying... (attempt ${attempt + 2}/${maxRetries + 1})`);
              reject(new Error('RETRY'));
              return;
            }
            
            reject(new Error(
              "The AI returned an empty response. This might be due to:\n" +
              "• API rate limits or quota exceeded\n" +
              "• Content safety filters\n" +
              "• Network issues\n\n" +
              "Please try again in a few moments."
            ));
            return;
          }
          
          const parsed = parseGeminiResponse(fullText);
          resolve(parsed);
        });

        stream.on('error', (error) => {
          clearInterval(timeoutId);
          console.error('❌ Stream error:', error.message);
          reject(error);
        });
      });

    } catch (error) {
      if (error.message === 'RETRY' && attempt < maxRetries) {
        console.log(`⏳ Waiting before retry...`);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 2000));
        continue;
      }
      
      if (attempt === maxRetries) {
        console.error('❌ All retry attempts failed');
        
        if (error.code === 'ECONNABORTED') {
          throw new Error('Connection timeout. Please check your internet connection and try again.');
        } else if (error.response?.status === 429) {
          throw new Error('API rate limit exceeded. Please wait a moment and try again.');
        } else if (error.response?.status === 403) {
          throw new Error('API access denied. Please check your API key.');
        } else {
          throw error;
        }
      }
      
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting before retry... (attempt ${attempt + 2}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 2000));
      }
    }
  }

  throw new Error('Failed after all retry attempts');
};

// ============================================
// NON-STREAMING API CALL
// ============================================
export const callGeminiAPI = async (promptText, options = {}) => {
  const { temperature = 0.7, maxRetries = 2, timeout = 90000 } = options;
  const API_KEY = getApiKey();
  
  if (!API_KEY) {
    console.error("Cannot call Gemini API: API key is missing");
    return null;
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

  const requestBody = {
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      temperature: temperature,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🚀 API attempt ${attempt + 1}/${maxRetries + 1}...`);
      
      const response = await axios.post(API_URL, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: timeout,
      });

      if (response.data?.candidates?.[0]?.finishReason === "SAFETY") {
        throw new Error("Content was blocked by AI safety filters. Try rephrasing your request.");
      }

      if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error("Unexpected API response structure:", JSON.stringify(response.data, null, 2));
        throw new Error("Invalid response from AI");
      }

      const textResponse = response.data.candidates[0].content.parts[0].text;
      return parseGeminiResponse(textResponse);

    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      
      if (error.code === 'ECONNABORTED') {
        console.error(`Attempt ${attempt + 1}: Request timeout`);
      } else if (error.response) {
        console.error(`Attempt ${attempt + 1}: API Error:`, {
          status: error.response.status,
          error: error.response.data?.error || error.message
        });
        
        if (error.response.status >= 400 && error.response.status < 500) {
          return null;
        }
      } else {
        console.error(`Attempt ${attempt + 1}:`, error.message);
      }

      if (isLastAttempt) {
        return null;
      }

      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 2000));
    }
  }

  return null;
};

// ============================================
// PARSE GEMINI RESPONSE - ROBUST WITH REPAIR
// ============================================
function parseGeminiResponse(textResponse) {
  console.log("📝 Parsing Gemini response (length:", textResponse.length, ")...");
  
  let cleanedText = textResponse
    .replace(/```json\s*/gi, '')
    .replace(/```javascript\s*/gi, '')
    .replace(/```js\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Try to find complete JSON array
  const jsonArrayMatch = cleanedText.match(/\[\s*\{[\s\S]*\}\s*\]/);
  
  if (jsonArrayMatch) {
    cleanedText = jsonArrayMatch[0];
    console.log("✅ Found JSON array");
  } else {
    console.warn("⚠️ No complete JSON array found, attempting repair...");
    
    // Try to find array start and repair
    const arrayStartIndex = cleanedText.indexOf('[');
    if (arrayStartIndex !== -1) {
      cleanedText = cleanedText.substring(arrayStartIndex);
      
      // Find last complete object
      let lastValidIndex = cleanedText.lastIndexOf('}');
      if (lastValidIndex !== -1) {
        // Check if there's a closing bracket after
        const afterLastBrace = cleanedText.substring(lastValidIndex + 1);
        if (!afterLastBrace.includes(']')) {
          // Add closing bracket
          cleanedText = cleanedText.substring(0, lastValidIndex + 1) + '\n]';
          console.log("🔧 Repaired JSON: added closing bracket");
        } else {
          // Use up to the closing bracket
          const closingBracket = cleanedText.indexOf(']', lastValidIndex);
          if (closingBracket !== -1) {
            cleanedText = cleanedText.substring(0, closingBracket + 1);
          }
        }
      }
    }
  }

  // Clean up any trailing commas before closing brackets
  cleanedText = cleanedText.replace(/,(\s*[\]}])/g, '$1');
  
  // Try to fix unterminated strings by finding last complete entry
  try {
    JSON.parse(cleanedText);
  } catch (firstError) {
    console.warn("⚠️ Initial parse failed, attempting advanced repair...");
    
    // Find all complete objects
    const objects = [];
    let depth = 0;
    let currentObj = '';
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < cleanedText.length; i++) {
      const char = cleanedText[i];
      
      if (escapeNext) {
        escapeNext = false;
        currentObj += char;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        currentObj += char;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '{') {
          if (depth === 0) currentObj = '';
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            currentObj += char;
            try {
              const testObj = JSON.parse(currentObj);
              if (testObj && typeof testObj === 'object') {
                objects.push(testObj);
              }
            } catch (e) {
              // Skip invalid objects
            }
            currentObj = '';
          }
        }
      }
      
      if (depth > 0) {
        currentObj += char;
      }
    }
    
    if (objects.length > 0) {
      console.log(`🔧 Recovered ${objects.length} complete objects from partial JSON`);
      return objects;
    }
  }

  try {
    const parsed = JSON.parse(cleanedText);
    console.log("✅ Successfully parsed JSON");
    
    if (Array.isArray(parsed)) {
      console.log(`📊 Array with ${parsed.length} items`);
    }
    
    return parsed;
  } catch (parseError) {
    console.error("❌ JSON parsing failed:", parseError.message);
    console.warn("Cleaned text preview:", cleanedText.substring(0, 500));
    
    // Last resort: try to extract objects manually
    console.warn("⚠️ Attempting manual object extraction...");
    const manualObjects = [];
    const regex = /\{[^{}]*"filename"[^{}]*"content"[^{}]*\}/g;
    let match;
    
    while ((match = regex.exec(textResponse)) !== null) {
      try {
        const obj = JSON.parse(match[0]);
        if (obj.filename && obj.content) {
          manualObjects.push(obj);
        }
      } catch (e) {
        // Skip
      }
    }
    
    if (manualObjects.length > 0) {
      console.log(`🔧 Manually extracted ${manualObjects.length} objects`);
      return manualObjects;
    }
    
    return textResponse;
  }
}

// ============================================
// VALIDATION HELPER
// ============================================
export function validateArrayResponse(response, requiredKeys = []) {
  if (!Array.isArray(response)) {
    console.error("❌ Validation failed: Not an array");
    return false;
  }

  if (response.length === 0) {
    console.error("❌ Validation failed: Empty array");
    return false;
  }

  const isValid = response.every((item, index) => {
    if (typeof item !== 'object' || item === null) {
      console.error(`❌ Item ${index} is not an object`);
      return false;
    }
    
    const missingKeys = requiredKeys.filter(key => !(key in item));
    if (missingKeys.length > 0) {
      console.error(`❌ Item ${index} missing keys:`, missingKeys);
      return false;
    }
    
    return true;
  });

  if (isValid) {
    console.log(`✅ Validation passed: ${response.length} valid items`);
  }

  return isValid;
}