const axios = require('axios');
const Book = require('../models/Book');

// Service for AI interactions
class AIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
  }
  
  // Get answer to a question about a book
  async askQuestion(bookId, question) {
    try {
      // Get the book
      const book = await Book.findById(bookId);
      if (!book) {
        throw new Error('Book not found');
      }
      
      // Check if book is processed
      if (!book.processed) {
        throw new Error('Book is still being processed');
      }
      
      // Get relevant book content
      const relevantChunks = this.findRelevantChunks(book.contentChunks, question);
      const context = relevantChunks.map(chunk => chunk.content).join(' ');
      
      // Set up prompt for OpenAI
      const messages = [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions about books. Use the provided book content to answer questions thoroughly and accurately. If you cannot answer the question based on the provided content, say so.`
        },
        {
          role: 'user',
          content: `Book: ${book.title} by ${book.author}\n\nContext from book: ${context}\n\nQuestion: ${question}`
        }
      ];
      
      // Make API request to OpenAI
      const response = await axios.post(this.apiUrl, {
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 600
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('AI service error:', error);
      throw error;
    }
  }
  
  // Find chunks relevant to the question using simple keyword matching
  findRelevantChunks(chunks, question) {
    // Simple implementation - in production, use embeddings/vector search
    const keywords = question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Score each chunk
    const scoredChunks = chunks.map(chunk => {
      const content = chunk.content.toLowerCase();
      const score = keywords.reduce((total, keyword) => {
        const matches = content.match(new RegExp(keyword, 'g'));
        return total + (matches ? matches.length : 0);
      }, 0);
      
      return { ...chunk, score };
    });
    
    // Sort by score and take top 5
    return scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }
}

module.exports = new AIService();