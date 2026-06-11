const PENDING_UPLOAD_TTL_MS = 60_000;

interface PendingImageUpload {
  files: File[];
  timeout: ReturnType<typeof setTimeout>;
}

const pendingImageUploads = new Map<string, PendingImageUpload>();

export function registerPendingImageUpload(files: File[]): string {
  const uploadId = crypto.randomUUID();
  const timeout = setTimeout(() => {
    pendingImageUploads.delete(uploadId);
  }, PENDING_UPLOAD_TTL_MS);

  pendingImageUploads.set(uploadId, { files, timeout });
  return uploadId;
}

export function consumePendingImageUpload(uploadId: string): File[] | null {
  const pending = pendingImageUploads.get(uploadId);
  if (!pending) return null;

  clearTimeout(pending.timeout);
  pendingImageUploads.delete(uploadId);
  return pending.files;
}

