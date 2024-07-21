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
  Paper,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { CloudUpload, Edit, Delete, Memory, Add, ExitToApp, Share } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';
import style from './LoginScreen.module.css';
import './App.css';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

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
  const [isLoading, setIsLoading] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleFetchResponse = useCallback(async (response) => {
    if (!response.ok) {
      if (response.status === 403) {
        alert('Your session has expired. Please log in again.');
        onLogout();
      } else {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    }
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      throw new Error('Expected JSON response from server.');
    }
  }, [onLogout]);

  const fetchAllPdfs = useCallback(() => {
    setIsLoading(true);
    fetch(`${process.env.REACT_APP_API_URL}/search`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(handleFetchResponse)
      .then(data => setSearchResults(data))
      .catch(error => console.error('Error fetching user PDFs:', error))
      .finally(() => setIsLoading(false));
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
      if (file.size > 10000000) {
        alert("File size should not exceed 10 MB.");
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
      .then(response => {
        if (!response.ok) {
          return response.json().then(errorData => {
            throw new Error(errorData.message || 'Unknown error occurred');
          });
        }
        return response.json();
      })
      .then(data => {
        alert('PDF uploaded and indexed!');
        fetchAllPdfs();  // Reload files after upload
      })
      .catch(error => {
        if (error.message === 'A file with this filename already exists.') {
          alert(error.message);
        } else {
          console.error('Error uploading PDF:', error);
          alert('Error uploading PDF. Please try again.');
        }
      });
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

  const handleDelete = (id, filename) => {
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
        const fileRef = ref(storage, `${filename}_${id}`);
        return deleteObject(fileRef);
      })
      .then(() => {
        setSearchResults(searchResults.filter(result => result._id !== id));
        alert('PDF deleted and sharing disabled.');
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

  const generatePdf = (filename, content) => {
    const doc = new jsPDF();
    doc.text(content, 10, 10);
    doc.save(filename);
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

  const uploadPdfToFirebase = async (filename, content, id) => {
    const doc = new jsPDF();
    doc.text(content, 10, 10);
    const pdfBlob = doc.output('blob');
    const pdfRef = ref(storage, `${filename}_${id}`);

    await uploadBytes(pdfRef, pdfBlob);
    const downloadURL = await getDownloadURL(pdfRef);
    return downloadURL;
  };

  const handleShare = async (filename, content, id) => {
    try {
      const shareableLink = await uploadPdfToFirebase(filename, content, id);
      navigator.clipboard.writeText(shareableLink);
      alert(`Shareable link copied to clipboard`);
    } catch (error) {
      console.error('Error generating shareable link:', error);
      alert('Error generating shareable link. Please try again.');
    }
  };

  const handleDisableShare = async (filename, id) => {
    try {
      const fileRef = ref(storage, `${filename}_${id}`);
      const fileExists = await getMetadata(fileRef).then(() => true).catch(() => false);
      if (!fileExists) {
        alert(`No sharing exists for ${filename}.`);
        return;
      }
      await deleteObject(fileRef);
      alert(`Sharing disabled for ${filename}.`);
      fetchAllPdfs();
    } catch (error) {
      console.error('Error disabling sharing:', error);
      alert('Error disabling sharing. Please try again.');
    }
  };

  return (
    <div className="App">
      <AppBar position="static" className="toolbar">
        <Toolbar>
          <IconButton edge="start" className="iconButton" aria-label="add new" onClick={openNewTab}>
            <Add />
          </IconButton>

          <InputBase
            className="inputBase"
            placeholder="Search file"
            inputProps={{ 'aria-label': 'search or type url' }}
            value={searchTerm}
            onChange={handleSearch}
            style={{ width: isMobile ? '60%' : 'auto' }}
          />
          {!isMobile && (
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
          )}
          <input
            accept="application/pdf"
            style={{ display: 'none' }}
            id="upload-button-file"
            type="file"
            onChange={handleUpload}
          />
          <label htmlFor="upload-button-file">
            <Button color="inherit" component="span" startIcon={<CloudUpload />} className="iconButton">
              {isMobile ? 'Upload' : 'Upload PDF'}
            </Button>
          </label>

          <IconButton color="inherit" onClick={handleChatWithPdf} className="iconButton">
            <Memory />
            <span style={{ fontSize: '0.875rem', fontWeight: 'normal' }}>{isMobile ? 'Chat' : 'Chat with PDFs'}</span>
          </IconButton>

          <Button color="inherit" onClick={handleLogout} startIcon={<ExitToApp />} style={{ marginLeft: 'auto' }}>
            {isMobile ? 'Logout' : 'Logout'}
          </Button>
        </Toolbar>
      </AppBar>
      <div>
        {isLoading ? (
          <Typography variant="h6" align="center">Loading...</Typography>
        ) : (
          searchResults.map((result) => (
            <div key={result._id} className="resultBar">
              <span
                style={{ color: 'blue', cursor: 'pointer' }}
                onClick={() => generatePdf(result.filename, result.content)}
              >
                {result.filename} - Uploaded on {new Date(result.uploadDate).toLocaleDateString()}
              </span>
              <div className="iconContainer">
                <IconButton onClick={() => openEditDialog(result.content, result._id)} className="iconButton"><Edit /></IconButton>
                <Button onClick={() => openRenameDialog(result._id)} className="button wheatButton">
                  Rename
                </Button>
                {user && user.id === result.createdBy.toString() && (
                  <IconButton onClick={() => handleDelete(result._id, result.filename)} className="iconButton"><Delete /></IconButton>
                )}
                <Button onClick={() => generatePdf(result.filename, result.content)} className="button wheatButton">
                  Generate PDF
                </Button>
                <Button onClick={() => handleShare(result.filename, result.content, result._id)} className="button wheatButton" startIcon={<Share />}>
                  Share
                </Button>
                <Button onClick={() => handleDisableShare(result.filename, result._id)} className="button wheatButton">
                  Disable Sharing
                </Button>
              </div>
            </div>
          ))
        )}
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
