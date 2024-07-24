require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const PDFParse = require('pdf-parse');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
const User = require('./models/User');
const PDF = require('./models/Pdf');
const authRoutes = require('./authRoutes');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const archiver = require('archiver');
const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = require('firebase/storage');
const docxConverter = require('docx-pdf');
const { initializeApp } = require('firebase/app');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to Database'))
  .catch(err => console.error('Could not connect to MongoDB', err));

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).send('Access Denied: No Token Provided!');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).send('Token expired');
      }
      return res.status(403).send('Invalid Token');
    }

    req.userId = decoded.id;
    next();
  });
};

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};
const firebaseApp = initializeApp(firebaseConfig);
const storage1 = getStorage(firebaseApp);

app.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const userId = req.userId;
  const fileType = req.file.mimetype;
  const originalFilename = req.file.originalname;

  if (fileType === 'application/pdf') {
    
    PDF.findOne({ filename: originalFilename, createdBy: userId })
      .then(existingPdf => {
        if (existingPdf) {
          return res.status(400).json({ message: 'A file with this filename already exists.' });
        }
        return PDFParse(req.file.buffer);
      })
      .then(data => {
        const newPdf = new PDF({
          title: 'Untitled PDF',
          content: data.text,
          filename: originalFilename,
          createdBy: userId
        });
        return newPdf.save();
      })
      .then(doc => res.json({ message: 'PDF uploaded and indexed!', id: doc._id }))
      .catch(error => {
        console.error('Error handling the PDF:', error);
        res.status(500).json({ message: 'Failed to process PDF', error: error.toString() });
      });
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    
    const tempPdfFilename = `${originalFilename.split('.')[0]}.pdf`;
    const tempPdfFilePath = `/tmp/${tempPdfFilename}`;

    const pdfBuffer = await new Promise((resolve, reject) => {
      fs.writeFile(tempPdfFilePath, req.file.buffer, (err) => {
        if (err) return reject(err);
        docxConverter(tempPdfFilePath, tempPdfFilePath, function(err) {
          if (err) return reject(err);
          fs.readFile(tempPdfFilePath, (err, data) => {
            if (err) return reject(err);
            resolve(data);
          });
        });
      });
    });

    const pdfRef = ref(storage1, `${tempPdfFilename}_${userId}`);
    await uploadBytes(pdfRef, pdfBuffer);
    const downloadURL = await getDownloadURL(pdfRef);
    
    PDFParse(pdfBuffer)
      .then(data => {
        const newPdf = new PDF({
          title: 'Untitled PDF',
          content: data.text,
          filename: originalFilename, 
          createdBy: userId
        });
        return newPdf.save();
      })
      .then(doc => {
        deleteObject(pdfRef);
        fs.unlinkSync(tempPdfFilePath); 
        res.json({ message: 'DOCX converted to PDF, uploaded and indexed!', id: doc._id });
      })
      .catch(error => {
        console.error('Error handling the DOCX to PDF conversion:', error);
        res.status(500).json({ message: 'Failed to process DOCX file', error: error.toString() });
      });
  } else {
    return res.status(400).send('Unsupported file type.');
  }
});


app.post('/chat-with-pdf', authenticateToken, async (req, res) => {
  const { question } = req.body;
  const userId = req.userId;

  try {
    await client.connect();
    const database = client.db('test'); 
    const pdfCollection = database.collection('pdfs'); 

    const objectId = new mongoose.Types.ObjectId(userId);

    const pdfs = await pdfCollection.find({ createdBy: objectId }).toArray();

    if (pdfs.length === 0) {
      return res.status(404).send('No PDFs found for the user.');
    }

    const pdfData = pdfs.map(pdf => `Title: ${pdf.filename}, Content: ${pdf.content}`).join(' ');

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const prompt = `Using the following PDFs: ${pdfData}, answer the question: ${question}.Give the response in not more than 5 lines.Keep it direct.`;

    const result = await model.generateContentStream([prompt]);

    let responseText = '';
    for await (const chunk of result.stream) {
      responseText += chunk.text();
    }

    res.json({ reply: responseText });

  } catch (error) {
    console.error('Error chatting with PDF:', error);
    res.status(500).json({ error: 'Failed to chat with PDF' });
  } finally {
    await client.close();
  }
});

app.get('/search', authenticateToken, (req, res) => {
  const query = req.query.query;
  const userId = req.userId;

  let searchQuery;
  if (query) {
    searchQuery = {
      $and: [
        { createdBy: new mongoose.Types.ObjectId(userId) },
        {
          $or: [
            { filename: { $regex: new RegExp(query, 'i') } },
            { content: { $regex: new RegExp(query, 'i') } }
          ]
        }
      ]
    };
  } else {
    searchQuery = { createdBy: new mongoose.Types.ObjectId(userId) };
  }

  PDF.find(searchQuery).sort('-uploadDate')
    .then(docs => res.json(docs))
    .catch(err => {
      console.error('Error searching PDFs:', err);
      res.status(400).json('Error: ' + err);
    });
});

app.delete('/delete/:id', authenticateToken, async (req, res) => {
  try {
    await client.connect();
    const database = client.db('test'); 
    const pdfCollection = database.collection('pdfs'); 

    const pdfId = req.params.id;
    const userId = req.userId;

    const pdf = await pdfCollection.findOne({ _id: new mongoose.Types.ObjectId(pdfId) });

    if (!pdf) {
      console.error('PDF not found.');
      return res.status(404).send('PDF not found.');
    }

    if (pdf.createdBy.toString() !== userId) {
      console.error('Unauthorized to delete this PDF.');
      return res.status(403).send('Unauthorized to delete this PDF.');
    }

    const result = await pdfCollection.deleteOne({ _id: new mongoose.Types.ObjectId(pdfId) });

    if (result.deletedCount === 1) {
      console.log("Successfully deleted one document.");
      res.json({ message: 'PDF deleted successfully!' });
    } else {
      console.log("No documents matched the query. Deleted 0 documents.");
      res.status(404).send('No documents matched the query.');
    }
  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).json({ message: 'Error deleting PDF', error: error.toString() });
  } finally {
    await client.close();
  }
});

app.put('/update/:id', (req, res) => {
  PDF.findByIdAndUpdate(req.params.id, { content: req.body.content }, { new: true })
    .then(updatedPdf => res.json(updatedPdf))
    .catch(err => res.status(400).json('Error: ' + err));
});

app.put('/rename/:id', authenticateToken, async (req, res) => {
  try {
    const { newFilename } = req.body;
    if (!newFilename) {
      return res.status(400).json({ message: 'New filename is required' });
    }

    await client.connect();
    const database = client.db('test'); 
    const pdfCollection = database.collection('pdfs'); 

    const pdfId = req.params.id;
    const userId = req.userId;

    const pdf = await pdfCollection.findOne({ _id: new mongoose.Types.ObjectId(pdfId) });

    if (!pdf) {
      console.error('PDF not found.');
      return res.status(404).send('PDF not found.');
    }

    if (pdf.createdBy.toString() !== userId) {
      console.error('Unauthorized to rename this PDF.');
      return res.status(403).send('Unauthorized to rename this PDF.');
    }

    const result = await pdfCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(pdfId) },
      { $set: { filename: newFilename } }
    );

    if (result.modifiedCount === 1) {
      console.log("Successfully renamed the document.");
      res.json({ message: 'PDF renamed successfully!' });
    } else {
      console.log("No documents matched the query. Updated 0 documents.");
      res.status(404).send('No documents matched the query.');
    }
  } catch (error) {
    console.error('Error renaming PDF:', error);
    res.status(500).json({ message: 'Error renaming PDF', error: error.toString() });
  } finally {
    await client.close();
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
