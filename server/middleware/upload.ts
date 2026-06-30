import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads', 'verification')

if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true })
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const userId = req.user!.userId
    const dir = path.join(UPLOAD_ROOT, userId)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).slice(0, 8) || '.bin'
    const safe = file.fieldname.replace(/[^a-z0-9_-]/gi, '')
    cb(null, `${safe}-${Date.now()}${ext}`)
  },
})

export const verificationUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 3 },
  fileFilter(_req, file, cb) {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype)
    cb(null, ok)
  },
})
