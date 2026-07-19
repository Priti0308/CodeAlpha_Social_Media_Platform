const fs = require('fs');
const path = require('path');

/**
 * Converts a file on disk to a Base64 data URI and deletes the temporary file from the disk.
 * @param {Object} file - The multer file object (e.g. req.file)
 * @returns {String|null} - Base64 Data URI or null
 */
const fileToBase64 = (file) => {
  if (!file) return null;
  
  try {
    const filePath = file.path;
    const mimeType = file.mimetype;
    
    // Read binary file data
    const fileData = fs.readFileSync(filePath);
    
    // Convert to Base64
    const base64Data = fileData.toString('base64');
    
    // Delete the local file to clean up disk storage
    try {
      fs.unlinkSync(filePath);
    } catch (unlinkErr) {
      console.error(`Error deleting temp file: ${unlinkErr.message}`);
    }
    
    return `data:${mimeType};base64,${base64Data}`;
  } catch (err) {
    console.error(`Error converting file to Base64: ${err.message}`);
    return null;
  }
};

module.exports = { fileToBase64 };
