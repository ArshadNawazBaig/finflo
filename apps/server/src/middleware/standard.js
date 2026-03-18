const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

module.exports = (app) => {
  // Global Request Logger for Debugging
  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production' || req.method !== 'GET') {
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`
      );
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());
  app.use(morgan('dev'));
  
  // Static files
  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
};
