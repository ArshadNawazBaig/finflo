const express = require('express'); // Explicit import for Vercel detection
const app = require('./apps/server/src/index');
module.exports = app;
