import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const BookReader = () => {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [content, setContent] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  
  // Fetch book data
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await axios.get(`/api/books/${id}`, {
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        });
        
        setBook(res.data);
        
        // Set total pages based on content chunks
        if (res.data.contentChunks) {
          setTotalPages(res.data.contentChunks.length);
          
          // Set initial content
          if (res.data.contentChunks.length > 0) {
            setContent(res.data.contentChunks[0].content);
          }
        }
      } catch (err) {
        setError('Error loading book');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBook();
  }, [id]);
  
  // Handle page navigation
  const goToPage = pageNum => {
    if (pageNum >= 0 && pageNum < totalPages) {
      setCurrentPage(pageNum);
      setContent(book.contentChunks[pageNum].content);
    }
  };
  
  // Handle asking a question
  const handleAskQuestion = async e => {
    e.preventDefault();
    
    if (!question.trim()) return;
    
    setAskingQuestion(true);
    setAnswer('');
    
    try {
      const res = await axios.post(
        `/api/books/${id}/ask`,
        { question },
        {
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        }
      );
      
      setAnswer(res.data.answer);
    } catch (err) {
      setAnswer('Sorry, I could not answer that question based on the book content.');
    } finally {
      setAskingQuestion(false);
    }
  };
  
  if (loading) return <div>Loading book...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!book) return <div>Book not found</div>;
  
  return (
    <div className="book-reader-container">
      <div className="book-header">
        <h2>{book.title}</h2>
        <h3>by {book.author}</h3>
      </div>
      
      <div className="reader-layout">
        <div className="book-content">
          <div className="content-text">
            {content}
          </div>
          
          <div className="pagination">
            <button 
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
            >
              Previous
            </button>
            <span>{currentPage + 1} of {totalPages}</span>
            <button 
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
            >
              Next
            </button>
          </div>
        </div>
        
        <div className="ai-assistant">
          <h3>Ask about this book</h3>
          <form onSubmit={handleAskQuestion}>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask a question about the book..."
              disabled={askingQuestion}
            />
            <button type="submit" disabled={askingQuestion}>
              {askingQuestion ? 'Thinking...' : 'Ask'}
            </button>
          </form>
          
          {answer && (
            <div className="answer-container">
              <h4>Answer:</h4>
              <p>{answer}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookReader;