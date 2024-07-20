const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
  title: String,
  content: String,
  filename: String,
  uploadDate: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 
});

module.exports = mongoose.model('PDF', pdfSchema);
