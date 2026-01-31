/**
 * File Upload Middleware
 */

import multer from 'multer';
import path from 'path';

// Configure storage
const storage = multer.memoryStorage();

// File filter - allow Excel and CSV files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv', // .csv (alternative MIME type)
  ];

  // Also check file extension as fallback (some browsers may not send correct MIME type)
  const fileExtension = file.originalname.toLowerCase().split('.').pop();
  const allowedExtensions = ['xlsx', 'xls', 'csv'];

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel (.xlsx, .xls) or CSV (.csv) files are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (increased for large CSV/Excel files)
  },
});

export const uploadExcel = upload.single('excelFile');

// Error handler for multer file size errors
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum file size is 50MB. Please use a smaller file or split your data into multiple files.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed',
    });
  }
  next();
};

