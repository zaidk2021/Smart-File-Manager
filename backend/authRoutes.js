const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const router = express.Router();
require('dotenv').config();


router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = new User({ username, password });
    await user.save();
    
res.status(201).json({ message: 'User registered successfully' });


  } catch (error) {
   

res.status(500).json({ error: error.message });
  }
});


router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await User.findOne({ username }); 
      if (!user) {
        return res.status(401).send('Authentication failed. User not found.');
      }
      if (await user.comparePassword(password)) {
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '5h' });

        console.log({ message: 'Authentication successful'});

        res.json({ message: 'Authentication successful', token, user: { id: user._id, username: user.username} });

      } else { 
        res.status(401).send('Authentication failed. Wrong password.');
      }
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
  

module.exports = router;
