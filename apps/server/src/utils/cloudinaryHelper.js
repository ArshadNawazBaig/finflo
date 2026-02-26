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

module.exports = {
  extractPublicId,
  deleteCloudinaryFile,
  deleteCloudinaryFileByUrl,
  uploadSignature,
};
