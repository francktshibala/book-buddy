const fs = require('fs');
const path = require('path');
const { EPub } = require('epub');
const Book = require('../models/Book');

// Process an EPUB file and extract content
exports.processEpubBook = async (bookId, filePath) => {
  try {
    const book = await Book.findById(bookId);
    if (!book) {
      throw new Error('Book not found');
    }
    
    // Create a new EPUB object
    const epub = new EPub(filePath);
    
    // Process the EPUB
    await new Promise((resolve, reject) => {
      epub.parse();
      
      epub.on('end', async () => {
        try {
          // Get book metadata
          book.metadata = new Map();
          book.metadata.set('title', epub.metadata.title);
          book.metadata.set('author', epub.metadata.creator);
          book.metadata.set('publisher', epub.metadata.publisher);
          book.metadata.set('language', epub.metadata.language);
          
          // Get book content
          const contentChunks = [];
          let chunkIndex = 0;
          
          // Process each chapter
          for (let i = 0; i < epub.flow.length; i++) {
            const chapter = epub.flow[i];
            
            // Get chapter content
            const chapterContent = await new Promise((resolve, reject) => {
              epub.getChapter(chapter.id, (err, text) => {
                if (err) reject(err);
                else resolve(text);
              });
            });
            
            // Strip HTML tags and split into chunks
            const plainText = chapterContent.replace(/<[^>]*>/g, ' ');
            
            // Split into ~1000 character chunks for AI processing
            const chunkSize = 1000;
            for (let j = 0; j < plainText.length; j += chunkSize) {
              const chunk = plainText.substring(j, j + chunkSize);
              contentChunks.push({
                content: chunk,
                index: chunkIndex++
              });
            }
          }
          
          // Save content chunks to book
          book.contentChunks = contentChunks;
          book.processed = true;
          await book.save();
          
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      epub.on('error', reject);
    });
    
    return book;
  } catch (error) {
    console.error('Error processing EPUB:', error);
    
    // Update book with error
    if (bookId) {
      const book = await Book.findById(bookId);
      if (book) {
        book.processingError = error.message;
        await book.save();
      }
    }
    
    throw error;
  }
};