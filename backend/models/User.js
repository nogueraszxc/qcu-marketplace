const mongoose = require('mongoose');

// Dito natin idine-define kung ano-ano ang mga detalye na ise-save natin sa database para sa bawat user.
const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Please add a name'] 
  },
  email: { 
    type: String, 
    required: [true, 'Please add an email'], 
    unique: true // Para hindi pwede ang dalawang magkaparehas na email
  },
  password: { 
    type: String, 
    required: [true, 'Please add a password'] 
  },
  role: { 
    type: String, 
    default: 'User' // Default na 'User' ang lahat ng gagawa ng account, pwede mo itong gawing 'Admin' sa database mamaya
  },
}, { 
  timestamps: true // Automatic na maglalagay ng 'createdAt' at 'updatedAt' sa database
});

module.exports = mongoose.model('User', userSchema);