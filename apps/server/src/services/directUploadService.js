const crypto = require('crypto');
const path = require('path');
const jwt = require('jsonwebtoken');
const { cloudinary } = require('../config/cloudinary');

const images = ['jpg', 'jpeg', 'png', 'webp'];
const policies = {
  general: { formats: images, maxMB: 5 },
  customer: { formats: [...images, 'pdf'], maxMB: 1 },
  user: { formats: images, maxMB: 2, transformation: 'c_limit,w_500,h_500' },
  ticket: { formats: [...images, 'gif', 'pdf'], maxMB: 5 },
  loanDoc: { formats: [...images, 'pdf'], maxMB: 5 },
  chat: { formats: [...images, 'gif', 'pdf', 'mp3', 'wav', 'm4a', 'ogg', 'webm', 'mp4'], maxMB: 25 },
  csv: { formats: ['csv'], maxMB: 5, temporary: true },
  ocr: { formats: [...images, 'pdf'], maxMB: 5, temporary: true },
};
const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const principal = (req) => `${req.member ? 'Member' : 'User'}:${req.member?._id || req.user?._id}`;

const signUpload = (req, res, next) => {
  try {
    const { kind, name, size, mimetype } = req.body || {};
    const policy = Object.hasOwn(policies, kind) ? policies[kind] : null;
    if (!policy || typeof name !== 'string' || name.length > 255 || typeof mimetype !== 'string') {
      throw badRequest('Invalid upload');
    }
    if (req.member && !['user', 'loanDoc', 'chat'].includes(kind)) {
      return res.status(403).json({ message: 'Upload not allowed' });
    }
    const extension = path.extname(name).slice(1).toLowerCase();
    if (!policy.formats.includes(extension) || !Number.isFinite(size) || size <= 0 || size > policy.maxMB * 1024 * 1024) {
      throw badRequest(`Allowed formats: ${policy.formats.join(', ')}; maximum ${policy.maxMB} MB`);
    }
    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      throw Object.assign(new Error('File storage is not configured'), { status: 503 });
    }
    const resourceType = kind === 'csv' ? 'raw'
      : ['mp3', 'wav', 'm4a', 'ogg', 'webm', 'mp4'].includes(extension) ? 'video' : 'image';
    const publicId = `loan-app/${policy.temporary ? 'temporary' : kind}/${crypto.randomUUID()}${resourceType === 'raw' ? '.csv' : ''}`;
    const params = {
      timestamp: Math.floor(Date.now() / 1000),
      public_id: publicId,
      overwrite: false,
      allowed_formats: policy.formats.join(','),
      type: policy.temporary ? 'authenticated' : 'upload',
    };
    if (policy.transformation) params.transformation = policy.transformation;
    const proof = jwt.sign({
      type: 'direct-upload', kind, publicId, resourceType, deliveryType: params.type,
      name: path.basename(name), mimetype, extension,
    }, process.env.JWT_SECRET, {
      expiresIn: '15m', audience: principal(req), issuer: 'finflo-upload', algorithm: 'HS256',
    });
    res.json({
      url: `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloud_name)}/${resourceType}/upload`,
      params: { ...params, api_key: config.api_key, signature: cloudinary.utils.api_sign_request(params, config.api_secret) },
      proof,
    });
  } catch (err) { next(err); }
};

const verifyUpload = async (req, descriptor, kind, maxBytes) => {
  let proof;
  try {
    proof = jwt.verify(descriptor.proof, process.env.JWT_SECRET, {
      audience: principal(req), issuer: 'finflo-upload', algorithms: ['HS256'],
    });
  } catch { throw badRequest('Upload authorization is invalid or expired'); }
  if (proof.type !== 'direct-upload' || proof.kind !== kind) throw badRequest('Upload purpose does not match');
  // Read trusted metadata, never accept a client-supplied URL, size or file type.
  const asset = await cloudinary.api.resource(proof.publicId, {
    resource_type: proof.resourceType, type: proof.deliveryType,
  });
  const policy = policies[kind];
  if (asset.public_id !== proof.publicId || !Number.isFinite(asset.bytes) || asset.bytes > maxBytes ||
      asset.bytes <= 0 || !policy.formats.includes(asset.format || proof.extension)) {
    throw badRequest('Uploaded file does not match the allowed format or size');
  }
  const file = {
    fieldname: descriptor.fieldname, originalname: proof.name, mimetype: proof.mimetype,
    filename: asset.public_id, path: asset.secure_url, size: asset.bytes,
  };
  if (policy.temporary) {
    const url = cloudinary.utils.private_download_url(proof.publicId,
      proof.resourceType === 'raw' ? '' : asset.format, {
        resource_type: proof.resourceType, type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + 60,
      });
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('Temporary upload could not be read');
      const chunks = [];
      let total = 0;
      for await (const chunk of response.body) {
        total += chunk.length;
        if (total > maxBytes) throw badRequest('Uploaded file is too large');
        chunks.push(chunk);
      }
      file.buffer = Buffer.concat(chunks);
    } finally {
      await cloudinary.uploader.destroy(proof.publicId, {
        resource_type: proof.resourceType, type: 'authenticated', invalidate: true,
      });
    }
  }
  return file;
};

const directUploadMiddleware = (fallback, { kind, maxBytes, fields, mode }) => async (req, res, next) => {
  if (req.body?.__directUploads === undefined) return fallback(req, res, next);
  try {
    const descriptors = req.body.__directUploads;
    delete req.body.__directUploads;
    if (!Array.isArray(descriptors) || descriptors.length > 10) throw badRequest('Invalid upload list');
    const counts = {};
    for (const descriptor of descriptors) {
      if (!descriptor || typeof descriptor.fieldname !== 'string' || typeof descriptor.proof !== 'string') {
        throw badRequest('Invalid upload');
      }
      const field = fields.find((f) => f.name === descriptor.fieldname);
      counts[descriptor.fieldname] = (counts[descriptor.fieldname] || 0) + 1;
      if (!field || counts[descriptor.fieldname] > field.maxCount) throw badRequest('Unexpected file field or too many files');
    }
    const files = [];
    for (const descriptor of descriptors) files.push(await verifyUpload(req, descriptor, kind, maxBytes));
    if (mode === 'single') req.file = files[0];
    else if (mode === 'array') req.files = files;
    else req.files = Object.fromEntries(fields.map(({ name }) => [name, files.filter((f) => f.fieldname === name)]));
    next();
  } catch (err) { next(err); }
};

module.exports = { signUpload, verifyUpload, directUploadMiddleware, policies };
