const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');

if (process.env.NODE_ENV !== 'test' && process.env.VERCEL !== '1') dotenv.config();

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
    // SECURITY: restrict to images + PDF only. Without this the previous
    // `resource_type: auto` config let users upload SVG/HTML which Cloudinary
    // would serve back and render as stored XSS in the support-ticket UI.
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'],
    resource_type: 'auto',
  },
});

const loanDocStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'loan-app/loan-documents',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf'],
    resource_type: 'auto',
  },
});

module.exports = {
  cloudinary,
  customerStorage,
  generalStorage,
  userStorage,
  ticketStorage,
  loanDocStorage,
  chatStorage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'loan-app/chat',
      // Restrict to images, audio and PDF. Bare `auto` allowed SVG/HTML.
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp3', 'wav', 'm4a', 'ogg', 'webm', 'mp4', 'pdf'],
      resource_type: 'auto', // handles images and audio
    },
  }),
};
