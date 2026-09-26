const { directUploadMiddleware } = require('../services/directUploadService');

const directMemoryUpload = (upload, kind) => {
  const single = upload.single.bind(upload);
  upload.single = (name) => directUploadMiddleware(single(name), {
    kind, maxBytes: upload.limits.fileSize, fields: [{ name, maxCount: 1 }], mode: 'single',
  });
  return upload;
};

module.exports = { directMemoryUpload };
