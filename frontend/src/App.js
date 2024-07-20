import React, { useState, useEffect, useCallback } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  InputBase,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  DialogTitle,
  FormControl,
  MenuItem,
  Select,
  InputLabel,
  Typography,
  Paper
} from '@mui/material';
import { CloudUpload, Edit, Delete, Memory, Add, ExitToApp } from '@mui/icons-material';
import zromeLogo from './chrome-logo.webp';
import { jsPDF } from 'jspdf';
import style from './LoginScreen.module.css';

function App({ onLogout }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]); 
  const [currentEditContent, setCurrentEditContent] = useState('');
  const [currentEditId, setCurrentEditId] = useState(null);
  const [currentRenameId, setCurrentRenameId] = useState(null);
  const [newFilename, setNewFilename] = useState('');
  const [user, setUser] = useState(null);
  const [sortOption, setSortOption] = useState('uploadDate'); 

  const handleFetchResponse = useCallback((response) => {
    if (!response.ok) {
      if (response.status === 403) {
        alert('Your session has expired. Please log in again.');
        onLogout();
      } else {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    }
    return response.json();
  }, [onLogout]);

  const fetchAllPdfs = useCallback(() => {
    fetch(`${process.env.REACT_APP_API_URL}/search`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(handleFetchResponse)
      .then(data => setSearchResults(data))
      .catch(error => console.error('Error fetching user PDFs:', error));
  }, [handleFetchResponse]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        onLogout();
      }
    } else {
      onLogout();
    }


    fetchAllPdfs();

  }, [onLogout, fetchAllPdfs]);

  const handleUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2000000) { // 1000 kilobytes * 1000 to convert to bytes
        alert("File size should not exceed 1000 KB.");
        return; 
      }
      if (file.type !== 'application/pdf') {
        alert("Only PDF files are accepted.");
        return; 
      }
      const formData = new FormData();
      formData.append('file', file);

      fetch(`${process.env.REACT_APP_API_URL}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      })
        .then(handleFetchResponse)
        .catch(error => console.error('Error uploading PDF:', error));
    }
  };

  const handleSortChange = (event) => {
    setSortOption(event.target.value);
    sortSearchResults(event.target.value);
  };

  const sortSearchResults = (sortBy) => {
    const sortedResults = [...searchResults].sort((a, b) => {
      if (sortBy === 'filename') {
        return a.filename.localeCompare(b.filename);
      } else { 
        return new Date(b.uploadDate) - new Date(a.uploadDate);
      }
    });
    setSearchResults(sortedResults);
  };

  const handleSearch = (event) => {
    const query = event.target.value;
    setSearchTerm(query);
    if (query.length > 2) {
      fetch(`${process.env.REACT_APP_API_URL}/search?query=${query}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
        .then(handleFetchResponse)
        .then(data => {
          setSearchResults(data);
        })
        .catch(error => console.error('Error fetching search results:', error));
    } else {
      
      fetchAllPdfs();
    }
  };

  const handleDelete = (id) => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
      alert('You are not authorized to delete this PDF.');
      return;
    }

    const result = searchResults.find(res => res._id === id && res.createdBy === user.id);

    if (!result) {
      alert('You are not authorized to delete this PDF.');
      return;
    }

    fetch(`${process.env.REACT_APP_API_URL}/delete/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
    })
      .then(handleFetchResponse)
      .then(() => {
        setSearchResults(searchResults.filter(result => result._id !== id));
      })
      .catch(error => {
        alert('Error deleting PDF: ' + error.message);
      });
  };

  const handleChatWithPdf = () => {
    setChatDialogOpen(true);
  };

  const submitChatQuestion = () => {
    fetch(`${process.env.REACT_APP_API_URL}/chat-with-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: chatQuestion }),
    })
      .then(handleFetchResponse)
      .then(data => {
        setChatHistory([...chatHistory, { question: chatQuestion, response: data.reply }]); 
        setChatQuestion(''); 
      })
      .catch(error => {
        alert('Error chatting with PDF: ' + error.message);
      });
  };

  const handleChatQuestionChange = (event) => {
    setChatQuestion(event.target.value);
  };

  const closeChatDialog = () => {
    setChatDialogOpen(false);
    setChatQuestion('');
    setChatHistory([]);
  };

  const openNewTab = () => {
    const currentUrl = window.location.href;
    window.open(currentUrl, '_blank');
  };

  const resultBarStyles = {
    display: 'flex',
    alignItems: 'center',
    padding: '5px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    margin: '10px 0',
    borderRadius: '5px',
  };

  const iconContainerStyles = {
    display: 'flex',
    alignItems: 'center',
  };

  const generatePdf = (filename, content) => {
    const doc = new jsPDF();
    doc.text(content, 10, 10);
    doc.save(filename);
  };
  
  const appStyles = {
    backgroundImage: `url(${zromeLogo})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    color: '#fff',
  };

  const toolbarStyles = {
    background: '#fff',
    color: 'black',
  };

  const inputBaseStyles = {
    flex: 1,
    marginLeft: '10px',
    border: '1px solid #ccc',
    padding: '5px 20px',
    borderRadius: '4px',
    width: '60%',
  };

  const iconButtonStyles = {
    color: '#555',
    fontSize: '1rem',
    margin: 0,
    padding: 0,
  };

  const buttonStyles = {
    backgroundColor: 'wheat',
    color: '#555',
    margin: '0 5px'
  };

  const openEditDialog = (content, id) => {
    setCurrentEditContent(content);
    setCurrentEditId(id);
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
  };

  const handleEditChange = (event) => {
    setCurrentEditContent(event.target.value);
  };

  const saveEdits = () => {
    fetch(`${process.env.REACT_APP_API_URL}/update/${currentEditId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: currentEditContent }),
    })
      .then(handleFetchResponse)
      .then(data => {
        const updatedResults = searchResults.map(item =>
          item._id === currentEditId ? { ...item, content: currentEditContent } : item
        );
        setSearchResults(updatedResults);
        closeEditDialog();
      })
      .catch(error => console.error('Error saving edits:', error));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  const openRenameDialog = (id) => {
    setCurrentRenameId(id);
    setRenameDialogOpen(true);
  };

  const closeRenameDialog = () => {
    setRenameDialogOpen(false);
  };

  const handleRenameChange = (event) => {
    setNewFilename(event.target.value);
  };

  const saveRename = () => {
    fetch(`${process.env.REACT_APP_API_URL}/rename/${currentRenameId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ newFilename }),
    })
      .then(handleFetchResponse)
      .then(data => {
        const updatedResults = searchResults.map(item =>
          item._id === currentRenameId ? { ...item, filename: newFilename } : item
        );
        setSearchResults(updatedResults);
        closeRenameDialog();
      })
      .catch(error => console.error('Error renaming file:', error));
  };

  return (
    <div className="App" style={appStyles}>
      <AppBar position="static" style={toolbarStyles}>
        <Toolbar>
          <IconButton edge="start" style={iconButtonStyles} aria-label="add new" onClick={openNewTab}>
            <Add />
          </IconButton>

          <InputBase
            style={inputBaseStyles}
            placeholder="Search or type URL"
            inputProps={{ 'aria-label': 'search or type url' }}
            value={searchTerm}
            onChange={handleSearch}
          />
          <FormControl style={{ marginLeft: 10, minWidth: 120 }}>
            <InputLabel id="sort-by-label">Sort By</InputLabel>
            <Select
              labelId="sort-by-label"
              value={sortOption}
              onChange={handleSortChange}
              style={{ backgroundColor: 'white', height: '40px' }}
            >
              <MenuItem value="filename">Filename</MenuItem>
              <MenuItem value="uploadDate">Upload Date</MenuItem>
            </Select>
          </FormControl>
          <input
            accept="application/pdf"
            style={{ display: 'none' }}
            id="upload-button-file"
            type="file"
            onChange={handleUpload}
          />
          <label htmlFor="upload-button-file">
            <Button color="inherit" component="span" startIcon={<CloudUpload />} style={iconButtonStyles}>
              Upload PDF
            </Button>
          </label>
         
          <IconButton color="inherit" onClick={handleChatWithPdf} style={iconButtonStyles}>
            <Memory />
            Chat with PDFs
          </IconButton>
          <Button color="inherit" onClick={handleLogout} startIcon={<ExitToApp />} style={{ marginLeft: 'auto' }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <div>
        {searchResults.map((result) => (
          <div key={result._id} style={resultBarStyles}>
            <span
              style={{ color: 'blue', cursor: 'pointer' }}
              onClick={() => generatePdf(result.filename, result.content)}
            >
              {result.filename} - Uploaded on {new Date(result.uploadDate).toLocaleDateString()}
            </span>
            <div style={iconContainerStyles}>
              <IconButton onClick={() => openEditDialog(result.content, result._id)} style={iconButtonStyles}><Edit /></IconButton>
              <Button onClick={() => openRenameDialog(result._id)} style={buttonStyles}>
                Rename
              </Button>
              {user && user.id === result.createdBy.toString() && (
                <IconButton onClick={() => handleDelete(result._id)} style={iconButtonStyles}><Delete /></IconButton>
              )}
              <Button onClick={() => generatePdf(result.filename, result.content)} style={buttonStyles}>
                Generate PDF
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={editDialogOpen} onClose={closeEditDialog}>
        <DialogTitle>Edit PDF Content</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="PDF Content"
            type="text"
            fullWidth
            multiline
            minRows={4}
            value={currentEditContent}
            onChange={handleEditChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={saveEdits} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={renameDialogOpen} onClose={closeRenameDialog}>
        <DialogTitle>Rename PDF</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="newFilename"
            label="New Filename"
            type="text"
            fullWidth
            minRows={4}
            value={newFilename}
            onChange={handleRenameChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRenameDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={saveRename} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={chatDialogOpen} onClose={closeChatDialog} fullWidth maxWidth="md">
        <DialogTitle>Chat with PDF</DialogTitle>
        <DialogContent dividers>
          {chatHistory.map((chat, index) => (
            <Paper key={index} elevation={2} style={{ padding: '10px', marginBottom: '10px' }}>
              <Typography variant="subtitle1"><strong>Q:</strong> {chat.question}</Typography>
              <Typography variant="subtitle1"><strong>A:</strong> {chat.response}</Typography>
            </Paper>
          ))}
        </DialogContent>
        <DialogActions>
          <TextField
            autoFocus
            margin="dense"
            id="chatQuestion"
            label="Ask a question"
            type="text"
            fullWidth
            multiline
            minRows={2}
            value={chatQuestion}
            onChange={handleChatQuestionChange}
          />
          <Button onClick={submitChatQuestion} color="primary" variant="contained">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
      <div className={style.footer}>
        <Typography variant="body2">&copy; {new Date().getFullYear()} Zaid's Project</Typography>
      </div>
    </div>
  );
}

export default App;
