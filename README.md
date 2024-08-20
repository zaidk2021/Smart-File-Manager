# Smart File Manager

## Overview

Smart File Manager is a web application built with the MERN stack (MongoDB, Express.js, React.js, Node.js) that allows users to upload, manage, and interact with their files, particularly PDFs. The application features a unique capability to chat with PDFs using Google Generative AI, enabling users to ask questions about the content of their documents and receive intelligent responses.

## Features

- **File Upload:** Upload PDFs and DOCX files.
- **File Management:** Rename, delete, and search through uploaded files.
- **PDF Conversion:** Convert DOCX files to PDF format.
- **Chat with PDF:** Use Google Generative AI to interact with the content of PDFs.
- **File Sharing:** Generate and disable shareable links for files.
- **Authentication:** Secure user authentication using JWT.
- **Firebase Integration:** Store and manage files using Firebase Storage.

## Tech Stack

- **Frontend:** React.js, Material-UI
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Storage:** Firebase Storage
- **AI Integration:** Google Generative AI (Gemini)
- **Other Tools:** Puppeteer, PDFParse, Multer

Getting Started
Prerequisites
Node.js and npm installed
MongoDB running locally or on a cloud service (e.g., MongoDB Atlas)
Firebase project setup with storage enabled
Google API key for Generative AI
Installation
Clone the repository:
git clone https://github.com/zaidk2021/Smart-File-Manager.git
cd Smart-File-Manager
Set up environment variables:

Create a .env file in the root directory with the following variables:

env
Copy code
MONGODB_URI=your-mongodb-uri
JWT_SECRET=your-jwt-secret
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-firebase-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-firebase-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=your-firebase-measurement-id
GOOGLE_API_KEY=your-google-api-key
Install dependencies:

Install backend dependencies:

bash
Copy code
cd backend
npm install
Install frontend dependencies:

bash
Copy code
cd frontend
npm install
Build and run the application:

For local development:

bash
Copy code
npm run dev
For production:

npm run start
Deployment on Render
Build Command:
cd backend && npm install
Start Command:
cd backend && npm start
Using the Application
Register/Login:

Create a new account or log in to an existing one.
Upload Files:

Upload PDF or DOCX files through the file upload interface.
Manage Files:

Search, rename, or delete files directly from the dashboard.
Chat with PDFs:

Select a PDF and use the "Chat" feature to ask questions about its content.
Share Files:

Generate shareable links for your files and disable them as needed.
Troubleshooting
Chromium Not Found Error: Ensure that the Puppeteer cache is properly configured in puppeteer.config.cjs. Check the deployment logs for the exact Chromium path and update executablePath if necessary.

Firebase Errors: Verify that your Firebase project settings and environment variables are correctly configured.

