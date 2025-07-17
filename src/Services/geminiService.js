import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor() {
    // Initialize Gemini with your API key
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY || 'AIzaSyC_XnFRyS6xkmoLO8KS2xJEzwnlNj16kkA';
    
    if (!apiKey || apiKey === 'AIzaSyC_XnFRyS6xkmoLO8KS2xJEzwnlNj16kkA') {
      console.error('Gemini API key not configured');
      this.isConfigured = false;
      return;
    }
    
    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.isConfigured = true;
      
      // Chat history to maintain context
      this.chatHistory = new Map(); // chatId -> conversation history
      
      console.log('Gemini service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Gemini service:', error);
      this.isConfigured = false;
    }
  }

  // Initialize chat history for a specific chat
  initializeChatHistory(chatId) {
    if (!this.chatHistory.has(chatId)) {
      this.chatHistory.set(chatId, []);
    }
  }

  // Add message to chat history
  addToHistory(chatId, role, message) {
    this.initializeChatHistory(chatId);
    const history = this.chatHistory.get(chatId);
    history.push({ role, parts: [{ text: message }] });
    
    // Keep only last 20 messages to manage context length
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
  }

  // Check if message is directed to AI - FIXED VERSION
  isAIMessage(message) {
    if (!message || typeof message !== 'string') {
      return false;
    }
    
    const aiTriggers = [
      '@ai',
      '@gemini',
      'hey ai',
      'hey gemini',
      'ai help',
      'ai:',
      'gemini:',
      'ai ',
      'gemini ',
      'summarize',
      'explain',
      'help me',
      'translate',
      'code',
      'brainstorm'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    
    // Check if message starts with or contains AI triggers
    return aiTriggers.some(trigger => 
      lowerMessage.startsWith(trigger) || 
      lowerMessage.includes(trigger)
    );
  }

  // Clean message by removing AI triggers - IMPROVED VERSION
  cleanMessage(message) {
    if (!message || typeof message !== 'string') {
      return message;
    }
    
    const aiTriggers = [
      '@ai',
      '@gemini',
      'hey ai',
      'hey gemini',
      'ai help',
      'ai:',
      'gemini:',
      'ai ',
      'gemini '
    ];
    
    let cleanedMessage = message.trim();
    
    // Remove AI triggers from the beginning
    for (const trigger of aiTriggers) {
      const lowerMessage = cleanedMessage.toLowerCase();
      if (lowerMessage.startsWith(trigger)) {
        cleanedMessage = cleanedMessage.slice(trigger.length).trim();
        break;
      }
    }
    
    // If message is empty after cleaning, return original
    return cleanedMessage || message;
  }

  // Generate AI response - ENHANCED VERSION
  async generateResponse(chatId, userMessage, userName = 'User') {
    try {
      // Check if service is configured
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'AI service not configured',
          message: 'AI service is not properly configured. Please check the API key.',
        };
      }

      console.log(`Generating response for chat ${chatId}:`, userMessage);
      
      this.initializeChatHistory(chatId);
      
      // Create a system prompt to make AI more helpful
      const systemPrompt = `You are a helpful AI assistant in a chat application. 
      You should provide clear, concise, and helpful responses. 
      When asked to summarize, provide a brief summary. 
      When asked to explain, provide clear explanations. 
      Be conversational and friendly.`;
      
      // Prepare the message with context
      const contextualMessage = `${systemPrompt}\n\nUser "${userName}" asks: ${userMessage}`;
      
      // Get chat history for context
      const history = this.chatHistory.get(chatId);
      
      // Create chat session with history
      const chat = this.model.startChat({
        history: history.length > 0 ? history : [],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      });

      // Generate response
      console.log('Sending message to Gemini...');
      const result = await chat.sendMessage(contextualMessage);
      const response = result.response;
      const aiMessage = response.text();

      console.log('Received AI response:', aiMessage);

      // Add both user message and AI response to history
      this.addToHistory(chatId, 'user', userMessage);
      this.addToHistory(chatId, 'model', aiMessage);

      return {
        success: true,
        message: aiMessage,
        timestamp: new Date(),
      };

    } catch (error) {
      console.error('Gemini API Error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('API_KEY') || error.message?.includes('401')) {
        return {
          success: false,
          error: 'Invalid API key',
          message: 'AI service authentication failed. Please check the API key configuration.',
        };
      }
      
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        return {
          success: false,
          error: 'API quota exceeded',
          message: 'AI service is temporarily unavailable due to high demand. Please try again later.',
        };
      }
      
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        return {
          success: false,
          error: 'Network error',
          message: 'Network connection issue. Please check your internet connection and try again.',
        };
      }
      
      return {
        success: false,
        error: error.message || 'Unknown error',
        message: `Sorry, I encountered an error: ${error.message || 'Unknown error'}. Please try again.`,
      };
    }
  }

  // Get AI response for chat - IMPROVED VERSION
  async getAIResponse(chatId, userMessage, userName) {
    try {
      console.log('Processing message:', userMessage);
      console.log('Is AI message?', this.isAIMessage(userMessage));
      
      // Check if message is directed to AI
      if (!this.isAIMessage(userMessage)) {
        console.log('Message not directed to AI, skipping...');
        return null; // Not an AI message
      }

      // Clean the message
      const cleanedMessage = this.cleanMessage(userMessage);
      console.log('Cleaned message:', cleanedMessage);
      
      // Generate response
      const response = await this.generateResponse(chatId, cleanedMessage, userName);
      
      console.log('AI response generated:', response);
      
      return response;
      
    } catch (error) {
      console.error('Error in getAIResponse:', error);
      return {
        success: false,
        error: error.message,
        message: 'Sorry, I encountered an error while processing your request. Please try again.',
      };
    }
  }

  // Clear chat history for a specific chat
  clearChatHistory(chatId) {
    if (this.chatHistory.has(chatId)) {
      this.chatHistory.delete(chatId);
    }
  }

  // Get suggestions for AI commands
  getAICommandSuggestions() {
    return [
      '@ai help - Get help from AI',
      '@ai explain [topic] - Get explanations',
      '@ai summarize [text] - Summarize content',
      '@ai translate [text] - Translate text',
      '@ai code [description] - Get code help',
      '@ai brainstorm [topic] - Generate ideas',
      'summarize [text] - Summarize any content',
      'explain [topic] - Get explanations',
      'help me with [topic] - Get assistance',
    ];
  }

  // Smart reply suggestions based on conversation
  async generateSmartReplies(chatId, lastMessage) {
    try {
      if (!this.isConfigured) {
        return [];
      }
      
      const contextMessage = `Generate 3 short, casual reply suggestions for this message: "${lastMessage}". Return only the suggestions, each on a new line, without numbers or bullets.`;
      
      const result = await this.generateResponse(chatId + '_suggestions', contextMessage);
      
      if (result.success) {
        return result.message
          .split('\n')
          .filter(line => line.trim())
          .slice(0, 3)
          .map(suggestion => suggestion.trim());
      }
      
      return [];
    } catch (error) {
      console.error('Smart reply generation error:', error);
      return [];
    }
  }

  // Test the service
  async testService() {
    try {
      const testResponse = await this.generateResponse('test', 'Hello, can you help me?', 'Test User');
      console.log('Service test result:', testResponse);
      return testResponse.success;
    } catch (error) {
      console.error('Service test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const geminiService = new GeminiService();

export default geminiService;

