const { cloudinary } = require('../config/cloudinary');

/**
 * Extract the public_id from a Cloudinary URL
 * @param {string} url - The Cloudinary URL
 * @returns {string|null} - The public_id or null if extraction fails
 */
const extractPublicId = (url) => {
  if (!url) return null;

  try {
    // Cloudinary URLs format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{version}/{public_id}.{format}
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;

    // Get everything after 'upload/' (skip version if present)
    let pathAfterUpload = parts.slice(uploadIndex + 1).join('/');

    // Skip version number if present (starts with 'v' followed by digits)
    if (pathAfterUpload.match(/^v\d+\//)) {
      pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
    }

    // Remove file extension
    return pathAfterUpload.replace(/\.[^/.]+$/, '');
  } catch (error) {
    console.error('Error extracting public_id from URL:', url, error);
    return null;
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The public_id of the file to delete
 * @param {string} resourceType - The resource type ('image', 'video', 'raw')
 * @returns {Promise<void>}
 */
const deleteCloudinaryFile = async (publicId, resourceType = 'image') => {
  if (!publicId) return;

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    console.log(`Deleted file from Cloudinary: ${publicId}`, result);
  } catch (error) {
    console.error(`Failed to delete file from Cloudinary: ${publicId}`, error);
    // Don't throw - we don't want Cloudinary failures to block database operations
  }
};

/**
 * Delete a file from Cloudinary using its URL
 * @param {string} url - The Cloudinary URL
 * @param {string} fileType - The file type ('image', 'audio', 'file')
 * @returns {Promise<void>}
 */
const deleteCloudinaryFileByUrl = async (url, fileType = 'image') => {
  const publicId = extractPublicId(url);
  if (!publicId) return;

  // Determine resource type based on file type
  let resourceType = 'image';
  if (fileType === 'audio') {
    resourceType = 'video'; // Audio files are stored as 'video' in Cloudinary
  } else if (fileType === 'file' || url.includes('.pdf')) {
    resourceType = 'raw'; // PDFs and other documents
  }

  await deleteCloudinaryFile(publicId, resourceType);
};

/**
 * Upload a signature (Base64) to Cloudinary
 * @param {string} signatureData - Base64 encoded signature image
 * @param {string} folder - Cloudinary folder path
 * @returns {Promise<object>} - Upload result
 */
const uploadSignature = async (signatureData, folder = 'signatures') => {
  if (!signatureData) return null;
  return await cloudinary.uploader.upload(signatureData, {
    folder,
    resource_type: 'image',
  });
};

/**
 * Mirror a remote image (typically a Google `lh3.googleusercontent.com`
 * profile picture) into our Cloudinary account and return the new permanent
 * URL. Cloudinary supports fetching remote URLs directly on upload, so we
 * just hand it the source URL.
 *
 * Why this exists: Google's CDN rate-limits browser fetches (429), so if you
 * have many Google-authenticated members on one page their avatars start
 * failing. Mirroring on first login decouples display from Google's CDN.
 *
 * Returns the new Cloudinary URL on success; falls back to the original URL
 * on any failure so login is never blocked.
 *
 * @param {string} url    Remote source URL
 * @param {string} folder Cloudinary folder
 * @returns {Promise<string|null>}
 */
const mirrorRemoteImage = async (url, folder = 'member_profiles') => {
  if (!url) return null;
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder,
      resource_type: 'image',
      // 256x256 face-cropped thumb is plenty for avatars and bounds storage.
      transformation: [
        { width: 256, height: 256, crop: 'fill', gravity: 'face' },
      ],
    });
    return result.secure_url || result.url || url;
  } catch (err) {
    console.error('[cloudinary] mirrorRemoteImage failed:', err?.message || err);
    return url; // fall back to the original URL so login still completes
  }
};

module.exports = {
  extractPublicId,
  deleteCloudinaryFile,
  deleteCloudinaryFileByUrl,
  uploadSignature,
  mirrorRemoteImage,
};
