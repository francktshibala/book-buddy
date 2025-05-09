const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Book = require('../models/Book');
const bookProcessor = require('../services/bookProcessor');
const aiService = require('../services/aiService');

// Set up file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const fileTypes = /epub|pdf|txt/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only EPUB, PDF, and TXT files are allowed'));
  }
});

// @route   POST api/books/upload
// @desc    Upload a new book
// @access  Private
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const { title, author } = req.body;
    
    if (!req.file || !title || !author) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Create new book
    const newBook = new Book({
      user: req.user.id,
      title,
      author,
      fileUrl: req.file.path,
      fileType: path.extname(req.file.originalname).substring(1)
    });
    
    const book = await newBook.save();
    
    // Process book asynchronously
    bookProcessor.processEpubBook(book._id, req.file.path)
      .catch(err => console.error('Error processing book:', err));
    
    res.status(201).json(book);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/books
// @desc    Get all user's books
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const books = await Book.find({ user: req.user.id })
      .select('-contentChunks')
      .sort({ createdAt: -1 });
    
    res.json(books);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/books/:id
// @desc    Get book by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Check book ownership
    if (book.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(book);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/books/:id/ask
// @desc    Ask a question about a book
// @access  Private
router.post('/:id/ask', auth, async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ message: 'Question is required' });
    }
    
    // Check if book exists and user owns it
    const book = await Book.findById(req.params.id).select('user processed');
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    if (book.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (!book.processed) {
      return res.status(400).json({ message: 'Book is still being processed' });
    }
    
    // Get answer from AI service
    const answer = await aiService.askQuestion(req.params.id, question);
    
    res.json({ answer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;