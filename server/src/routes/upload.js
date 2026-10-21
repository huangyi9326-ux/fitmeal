/**
 * 图片上传接口
 * 前端通过 FormData 上传，字段名固定为 file
 * 返回值中的 url 可直接用于 <img src>（后端已托管 /uploads 静态目录）
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { success, fail } = require('../utils/response');

const router = express.Router();
const uploadDir = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 最大 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error('仅支持 jpg / png / webp / gif 格式的图片'));
    }
    return cb(null, true);
  },
});

router.post('/', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return fail(res, err.message || '上传失败', 400);
    if (!req.file) return fail(res, '请选择要上传的图片', 400);

    return success(res, {
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
      size: req.file.size,
    }, '上传成功');
  });
});

module.exports = router;
