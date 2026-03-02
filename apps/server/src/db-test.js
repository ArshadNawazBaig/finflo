const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Conversation = require('./models/Conversation');

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to DB');
    const conv = await Conversation.findOne({
      'participants.participantModel': 'Member',
    }).lean();
    console.log(JSON.stringify(conv, null, 2));
    mongoose.connection.close();
  })
  .catch(console.error);
