import React, { useState } from 'react';
import axios from 'axios';

const BookUpload = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const onFileChange = e => {
    setFile(e.target.files[0]);
    
    // Try to extract title from filename
    if (e.target.files[0]) {
      const filename = e.target.files[0].name;
      const bookTitle = filename.split('.')[0].replace(/[-_]/g, ' ');
      setTitle(bookTitle);
    }
  };
  
  const onSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    // Validate inputs
    if (!file || !title || !author) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }
    
    // Validate file type
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt !== 'epub' && fileExt !== 'pdf' && fileExt !== 'txt') {
      setError('Only EPUB, PDF, and TXT files are supported');
      setLoading(false);
      return;
    }
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('author', author);
      
      // Upload book
      const res = await axios.post('/api/books/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      setMessage('Book uploaded successfully! It is now being processed.');
      
      // Reset form
      setFile(null);
      setTitle('');
      setAuthor('');
      document.getElementById('file-upload').value = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Error uploading book');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="book-upload-container">
      <h2>Upload a Book</h2>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="file-upload">Book File (EPUB, PDF, TXT)</label>
          <input
            type="file"
            id="file-upload"
            onChange={onFileChange}
            accept=".epub,.pdf,.txt"
          />
        </div>
        <div className="form-group">
          <label htmlFor="title">Book Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="author">Author</label>
          <input
            type="text"
            id="author"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            required
          />
        </div>
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
        >
          {loading ? 'Uploading...' : 'Upload Book'}
        </button>
      </form>
    </div>
  );
};

export default BookUpload;