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

  // APK downloads — serve with correct MIME type so browsers don't extract as zip
  app.get('/downloads/:filename', (req, res) => {
    // path.basename strips any directory components, neutralising ../ traversal.
    const safeName = path.basename(req.params.filename || '');
    // Allow only simple .apk filenames composed of safe characters.
    if (!/^[A-Za-z0-9._-]+\.apk$/.test(safeName)) {
      return res.status(404).send('Not found');
    }
    const downloadsRoot = path.resolve(__dirname, '../../downloads');
    const filePath = path.resolve(downloadsRoot, safeName);
    // Defence-in-depth: refuse anything that escapes the downloads root.
    if (!filePath.startsWith(downloadsRoot + path.sep)) {
      return res.status(404).send('Not found');
    }
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.sendFile(filePath, (err) => {
      if (err) res.status(404).send('File not found');
    });
  });

};
