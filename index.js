const express = require('express');
const EmailService = require('./service');

const app = express();
app.use(express.json());

const emailService = new EmailService();

app.get('/', (req, res) => {
  res.send('Welcome to the Email Service API. Use POST /send to send emails.');
});

app.post('/send', async (req, res) => {
  const email = req.body;
  if (!email.id || !email.to) {
    return res.status(400).json({ error: 'Email id and to address are required' });
  }
  const status = await emailService.sendEmail(email);
  res.json({ status });
});

app.get('/status/:id', (req, res) => {
  const status = emailService.getStatus(req.params.id);
  res.json({ status });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
