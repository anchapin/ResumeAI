# File Upload Troubleshooting Runbook

**Last Updated:** March 9, 2026  
**Maintained By:** DevOps / Platform Team  
**Status:** Production Ready

---

## Table of Contents

1. [File Upload Overview](#file-upload-overview)
2. [Upload Monitoring](#upload-monitoring)
3. [Common Issues](#common-issues)
4. [Storage Management](#storage-management)
5. [File Processing Issues](#file-processing-issues)
6. [Data Recovery](#data-recovery)

---

## File Upload Overview

ResumeAI handles various file types:
- **Resumes**: PDF, DOCX, HTML
- **Images**: JPEG, PNG (for profile photos)
- **Exports**: ZIP (for bulk exports)

**Upload Configuration:**
- Max File Size: 10MB
- Allowed Types: PDF, DOCX, HTML, JPEG, PNG
- Storage: Local filesystem / S3-compatible
- Processing: Async with queue

---

## Upload Monitoring

### Check Upload Status

```bash
# Check file storage usage
df -h /mnt/uploads

# Check S3 storage (if using S3)
aws s3 ls s3://resumeai-uploads/

# Check upload queue
redis-cli LLEN celery:uploads

# View recent uploads
psql $DATABASE_URL -c "
SELECT id, user_id, file_name, file_size, status, created_at
FROM uploaded_files
ORDER BY created_at DESC
LIMIT 20;"
```

### Monitor Storage Metrics

| Metric | Warning | Critical |
|--------|---------|----------|
| Storage Used | > 70% | > 90% |
| Upload Success Rate | < 95% | < 90% |
| Avg Upload Time | > 30s | > 60s |
| Failed Uploads (1h) | > 10 | > 50 |

### View Upload Logs

```bash
# Check upload logs
kubectl logs -n production deployment/resume-api | grep -i "upload" | tail -50

# Check for errors
kubectl logs -n production deployment/resume-api | grep -i "error\|fail" | tail -50

# Check processing logs
kubectl logs -n production deployment/celery-worker | grep -i "process\|upload" | tail -50
```

---

## Common Issues

### Upload Fails - File Too Large

**Symptoms:**
- Error: "File exceeds maximum size"
- HTTP 413 error

**Diagnosis:**

```bash
# Check file size
ls -lh /tmp/uploaded_file

# Check configuration
echo $MAX_UPLOAD_SIZE
echo $MAX_FILE_SIZE
```

**Resolution:**

1. Check client-side:
   ```javascript
   // Check file size before upload
   if (file.size > 10 * 1024 * 1024) {
     alert('File too large');
   }
   ```

2. Increase limit (if needed):
   ```python
   # In FastAPI app
   app.add_middleware(
       Middleware(
           RequestSizeLimitRequestMiddleware,
           max_body_size=15 * 1024 * 1024  # 15MB
       )
   )
   ```

### Upload Fails - Invalid File Type

**Symptoms:**
- Error: "File type not allowed"
- Uploaded file corrupted

**Diagnosis:**

```bash
# Check file type
file /tmp/uploaded_file
file --mime-type /tmp/uploaded_file

# Check allowed types
echo $ALLOWED_FILE_TYPES
```

**Resolution:**

1. Verify file type on client:
   ```javascript
   const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
   if (!allowedTypes.includes(file.type)) {
     alert('Invalid file type');
   }
   ```

2. Check file magic bytes:
   ```python
   # Verify actual file type
   import magic
   mime = magic.from_file(file_path, mime=True)
   ```

### Upload Timeout

**Symptoms:**
- Upload hangs
- 504 Gateway Timeout

**Diagnosis:**

```bash
# Check network
ping -c 10 api.resumeai.com

# Check proxy timeout
kubectl get ingress -n production

# Check upload endpoint
curl -X POST https://api.resumeai.com/api/upload -v
```

**Resolution:**

1. Increase timeout:
   ```python
   # In nginx.conf
   client_max_body_size 15M;
   proxy_read_timeout 120s;
   
   # In FastAPI
   @app.post("/api/upload")
   async def upload_file(request: Request):
       # Process file
   ```

2. Use chunked upload:
   ```javascript
   // For large files
   const chunkSize = 1024 * 1024; // 1MB chunks
   // Upload in chunks
   ```

### Storage Full

**Symptoms:**
- Error: "No space left on device"
- Upload fails intermittently

**Diagnosis:**

```bash
# Check disk space
df -h

# Check inode usage
df -i

# Find large directories
du -sh /mnt/uploads/*
du -sh /var/log/*
```

**Resolution:**

1. Clean up old files:
   ```bash
   # Remove old temporary files
   find /tmp -type f -mtime +7 -delete
   
   # Remove old processed files
   find /mnt/uploads/processed -type f -mtime +30 -delete
   ```

2. Archive old data:
   ```bash
   # Move to cold storage
   aws s3 mv /mnt/uploads/2025/ s3://resumeai-archive/2025/ --storage-class=GLACIER
   ```

3. Expand storage:
   ```bash
   # For Kubernetes PVC
   kubectl patch pvc upload-storage -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'
   ```

---

## Storage Management

### Check Storage Usage

```bash
# Check total storage
df -h /mnt/uploads

# Check by user
psql $DATABASE_URL -c "
SELECT user_id, sum(file_size) as total_size, count(*) as file_count
FROM uploaded_files
GROUP BY user_id
ORDER BY total_size DESC
LIMIT 10;"

# Check by file type
psql $DATABASE_URL -c "
SELECT file_type, count(*) as count, sum(file_size) as total_size
FROM uploaded_files
GROUP BY file_type;"
```

### Manage User Quotas

```bash
# Check user quota
psql $DATABASE_URL -c "
SELECT u.email, u.storage_quota, 
       COALESCE(SUM(f.file_size), 0) as used
FROM users u
LEFT JOIN uploaded_files f ON u.id = f.user_id
WHERE u.id = 12345
GROUP BY u.id, u.email, u.storage_quota;"

# Update quota
psql $DATABASE_URL -c "
UPDATE users SET storage_quota = 1073741824 WHERE id = 12345;"  # 1GB
```

### Cleanup Old Files

```bash
# Delete files not accessed in 90 days
psql $DATABASE_URL -c "
SELECT id, file_path FROM uploaded_files 
WHERE last_accessed < now() - interval '90 days';"

# Delete orphaned files (not in DB)
find /mnt/uploads -type f -mtime +90 | while read file; do
  filename=$(basename "$file")
  exists=$(psql $DATABASE_URL -t -c "SELECT 1 FROM uploaded_files WHERE file_name = '$filename'")
  if [ -z "$exists" ]; then
    rm "$file"
  fi
done
```

---

## File Processing Issues

### PDF Processing Fails

**Symptoms:**
- Upload succeeds but PDF generation fails
- Blank PDF output

**Diagnosis:**

```bash
# Check processing queue
redis-cli LLEN celery:pdf_generation

# Check task result
celery -A resume_api result <task_id>

# Check processing logs
kubectl logs -n production deployment/celery-worker | grep -i "pdf\|error" | tail -50
```

**Resolution:**

1. Check source file:
   ```bash
   # Verify PDF is valid
   pdftotext /mnt/uploads/file.pdf - 2>&1 | head
   
   # Check file integrity
   file /mnt/uploads/file.pdf
   ```

2. Re-process:
   ```python
   # Trigger re-processing
   from resume_api.tasks import process_resume
   process_resume.delay(file_id)
   ```

### DOCX Conversion Fails

**Symptoms:**
- Cannot convert DOCX to PDF
- Missing formatting

**Diagnosis:**

```bash
# Check DOCX structure
unzip -l /mnt/uploads/file.docx

# Check for macros
unzip -l /mnt/uploads/file.docx | grep -i macro
```

**Resolution:**

1. Convert using LibreOffice:
   ```bash
   libreoffice --headless --convert-to pdf --outdir /tmp /mnt/uploads/file.docx
   ```

2. Notify user of limitations:
   ```python
   # Return error with explanation
   return {
       "error": "Complex DOCX formatting may not convert accurately",
       "suggestion": "Please save as PDF or use simpler formatting"
   }
   ```

### Image Processing Fails

**Symptoms:**
- Images not displaying
- Thumbnail generation fails

**Diagnosis:**

```bash
# Check image format
file /mnt/uploads/image.jpg

# Check image dimensions
identify /mnt/uploads/image.jpg

# Check for corruption
identify -verbose /mnt/uploads/image.jpg
```

**Resolution:**

1. Re-process image:
   ```python
   from PIL import Image
   
   img = Image.open('/mnt/uploads/image.jpg')
   img.thumbnail((800, 800))
   img.save('/mnt/uploads/image_thumb.jpg', quality=85)
   ```

2. Fix permissions:
   ```bash
   chown -R www-data:www-data /mnt/uploads
   chmod -R 755 /mnt/uploads
   ```

---

## Data Recovery

### Recover Deleted File

**Symptoms:**
- File not accessible
- 404 error for uploaded file

**Diagnosis:**

```bash
# Check database record
psql $DATABASE_URL -c "
SELECT * FROM uploaded_files WHERE id = 12345;"

# Check if file exists
ls -la /mnt/uploads/$(date +%Y/%m)/
```

**Resolution:**

1. Check soft delete:
   ```bash
   # If using soft delete
   psql $DATABASE_URL -c "
   SELECT * FROM uploaded_files 
   WHERE id = 12345 AND deleted_at IS NOT NULL;"
   ```

2. Restore from backup:
   ```bash
   # Restore from daily backup
   tar -xzf /backups/uploads-20260309.tar.gz -C /mnt/
   ```

3. Re-create record:
   ```psql
   INSERT INTO uploaded_files (user_id, file_name, file_path, file_size, status, created_at)
   VALUES (12345, 'resume.pdf', '/mnt/uploads/2026/03/resume.pdf', 102400, 'active', now());
   ```

### Restore Accidentally Deleted Files

**Procedure:**

```bash
# 1. Find deletion time
psql $DATABASE_URL -c "
SELECT id, file_name, deleted_at FROM uploaded_files 
WHERE deleted_at IS NOT NULL 
AND deleted_at > '2026-03-07 10:00:00';"

# 2. Check backup
ls /backups/uploads/2026/03/07/

# 3. Restore files
cp /backups/uploads/2026/03/07/* /mnt/uploads/2026/03/07/

# 4. Restore database records
psql $DATABASE_URL -c "
UPDATE uploaded_files 
SET deleted_at = NULL 
WHERE deleted_at > '2026-03-07 10:00:00';"
```

### Corrupted File Recovery

**Procedure:**

```bash
# 1. Identify corrupted files
find /mnt/uploads -type f -name "*.pdf" -exec pdftotext {} - 2>/dev/null \; | grep -l "cannot" || echo "OK"

# 2. Check original (if using version control)
git checkout HEAD -- /mnt/uploads/

# 3. Request re-upload from user
psql $DATABASE_URL -c "
SELECT user_id, email, file_name FROM uploaded_files 
WHERE id = 12345;"

# 4. Mark as corrupted
psql $DATABASE_URL -c "
UPDATE uploaded_files SET status = 'corrupted' WHERE id = 12345;"
```

---

## Quick Reference

### Common Commands

```bash
# Check storage
df -h /mnt/uploads

# List recent uploads
psql $DATABASE_URL -c "SELECT * FROM uploaded_files ORDER BY created_at DESC LIMIT 10;"

# Delete file record
psql $DATABASE_URL -c "DELETE FROM uploaded_files WHERE id = 12345;"

# Check processing status
redis-cli LLEN celery:pdf_generation

# View upload errors
kubectl logs -n production deployment/resume-api | grep -i upload | tail -50
```

---

## Related Documentation

- [RUNBOOKS.md](./RUNBOOKS.md) - Main runbook
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - General troubleshooting
- [STORAGE_QUOTA_IMPLEMENTATION.md](../STORAGE_QUOTA_IMPLEMENTATION.md) - Storage quotas
- [STORAGE_QUICK_START.md](../STORAGE_QUICK_START.md) - Storage setup

---

**Last Reviewed:** March 9, 2026  
**Next Review:** April 9, 2026 (Monthly)  
**Owner:** DevOps Team
