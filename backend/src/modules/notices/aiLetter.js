/**
 * AI Letter Generation Module
 * Handles AI-powered letter body generation using Groq API
 */

import axios from 'axios';
import { GROQ_API_KEY } from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * Generate letter body from prompt using Groq API
 * @param {string} prompt - User's prompt/request
 * @returns {string} Generated letter body
 */
export async function generateLetterBodyFromPrompt(prompt) {
  try {
    // Get Groq API key
    const apiKey = GROQ_API_KEY || process.env.GROQ_API_KEY;
    
    logger.debug('🔍 Checking Groq API key...');
    logger.debug('API key exists:', !!apiKey);
    logger.debug('API key preview:', apiKey ? `${apiKey.substring(0, 10)}...` : 'N/A');
    
    if (!apiKey) {
      throw new Error('Groq API key not configured. Please set GROQ_API_KEY in backend/.env file and restart the server. Get your free API key from: https://console.groq.com');
    }

    // Use only the user's prompt - no additional context
    const fullPrompt = prompt.trim();

    logger.debug('Generating letter body with Groq AI...');
    
    // Groq API endpoint (OpenAI-compatible)
    // Using llama-3.1-8b-instant (fast, free tier compatible)
    // Alternative models: mixtral-8x7b-32768, llama-3.1-70b-versatile
    const modelName = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    const response = await axios.post(
      apiUrl,
      {
        model: modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a professional letter writer for EPFO recovery department. Write formal, professional business letters in English.'
          },
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 seconds timeout
      }
    );

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const generatedText = response.data.choices[0].message.content.trim();
      logger.debug('✅ Letter body generated successfully');
      logger.debug('Generated text length:', generatedText.length);
      return generatedText;
    } else {
      throw new Error('Invalid response from Groq API');
    }
  } catch (error) {
    logger.error('Error generating letter body with AI:', error);
    
    if (error.response) {
      // API error response
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 401) {
        throw new Error('Invalid Groq API key. Please check your GROQ_API_KEY in backend/.env file.');
      } else if (status === 429) {
        throw new Error('Groq API rate limit exceeded. Please try again later.');
      } else if (status === 500) {
        throw new Error('Groq API server error. Please try again later.');
      } else {
        throw new Error(`Groq API error (${status}): ${data?.error?.message || data?.message || 'Unknown error'}`);
      }
    } else if (error.request) {
      // Request made but no response
      throw new Error('No response from Groq API. Please check your internet connection and try again.');
    } else {
      // Error setting up request
      throw error;
    }
  }
}

