const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const customerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'loan-app/customers',
    allowed_formats: ['jpg', 'png', 'pdf', 'jpeg', 'webp'],
    resource_type: 'auto', // Important for PDFs
  },
});

const generalStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'loan-app/general',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const userStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'loan-app/users',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
});

const ticketStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'loan-app/tickets',
    resource_type: 'auto',
  },
});

module.exports = {
  cloudinary,
  customerStorage,
  generalStorage,
  userStorage,
  ticketStorage,
  chatStorage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'loan-app/chat',
      resource_type: 'auto', // handles images and audio
    },
  }),
};
