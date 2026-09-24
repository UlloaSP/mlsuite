#!/bin/sh
set -eu

: "${STORAGE_ENDPOINT:?STORAGE_ENDPOINT is required}"
: "${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}"
: "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}"
: "${STORAGE_ACCESS_KEY:?STORAGE_ACCESS_KEY is required}"
: "${STORAGE_SECRET_KEY:?STORAGE_SECRET_KEY is required}"
: "${STORAGE_BUCKET:?STORAGE_BUCKET is required}"

[ "$MINIO_ROOT_USER" != "$STORAGE_ACCESS_KEY" ] || {
  echo "MinIO root and application users must differ" >&2
  exit 1
}
case "$STORAGE_BUCKET" in
  *[!a-z0-9.-]*|'') echo "Invalid storage bucket" >&2; exit 1 ;;
esac

mc alias set local "$STORAGE_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc mb --ignore-existing "local/$STORAGE_BUCKET"
mc version enable "local/$STORAGE_BUCKET"
version_info=$(mc version info "local/$STORAGE_BUCKET")
case "$version_info" in
  *[Ee]nabled*) printf '%s\n' "$version_info" ;;
  *) printf '%s\n' "$version_info" >&2; exit 1 ;;
esac

printf '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation", "s3:ListBucket", "s3:ListBucketMultipartUploads"],
      "Resource": ["arn:aws:s3:::%s"]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:AbortMultipartUpload", "s3:DeleteObject", "s3:DeleteObjectVersion", "s3:GetObject", "s3:GetObjectVersion", "s3:ListMultipartUploadParts", "s3:PutObject"],
      "Resource": ["arn:aws:s3:::%s/*"]
    }
  ]
}\n' "$STORAGE_BUCKET" "$STORAGE_BUCKET" > /tmp/mlsuite-app-policy.json

mc admin policy create local mlsuite-app /tmp/mlsuite-app-policy.json
mc admin user add local "$STORAGE_ACCESS_KEY" "$STORAGE_SECRET_KEY"
mc admin policy attach local mlsuite-app --user "$STORAGE_ACCESS_KEY"
