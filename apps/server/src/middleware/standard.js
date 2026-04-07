const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

module.exports = (app) => {
  // Verbose request logger — dev only to avoid I/O overhead in production
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`
      );
      next();
    });
  }

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());
  // Use 'tiny' format in prod (minimal I/O), 'dev' locally for colourised output
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));
  
  // Static files
  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
};
