// Cloudinary file upload utility
// Free 25 GB storage, no credit card required

const CLOUDINARY_CLOUD_NAME = "dadcxk4ww";
const CLOUDINARY_UPLOAD_PRESET = "pvc_uploads";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format: string;
  size: number;
  resourceType: string; // "image" or "raw"
  originalFilename: string;
}

// Convert base64 data URL to Blob
function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Determine the right resource type for Cloudinary based on file type
function getResourceType(mimeType: string): "image" | "raw" {
  // Images use "image" resource type (jpg, png, gif, webp, etc.)
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  // PDFs and everything else use "raw" for proper download support
  return "raw";
}

// Upload single file to Cloudinary
export async function uploadToCloudinary(
  file: { name: string; type: string; data: string },
  trackingId: string
): Promise<CloudinaryUploadResult> {
  const blob = dataURLtoBlob(file.data);
  const resourceType = getResourceType(file.type);

  // Use specific resource_type endpoint instead of "auto"
  // This ensures PDFs go to "raw" not "image"
  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  // Create FormData for upload
  const formData = new FormData();
  formData.append("file", blob, file.name);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `orders/${trackingId}`);

  // Add public_id - for raw files we need to include the extension
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const baseName = cleanName.replace(/\.[^/.]+$/, "");
  const publicId = `${Date.now()}_${baseName}`;
  formData.append("public_id", publicId);

  // Upload to Cloudinary
  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }

  const data = await response.json();

  return {
    url: data.secure_url,
    publicId: data.public_id,
    format: data.format || file.name.split(".").pop() || "",
    size: data.bytes || blob.size,
    resourceType: data.resource_type || resourceType,
    originalFilename: file.name,
  };
}

// Build a proper download URL for any Cloudinary file
// Adds fl_attachment with custom filename for forced download
export function getCloudinaryDownloadUrl(url: string, fileName: string): string {
  // Replace any spaces or special chars in filename for URL
  const cleanFileName = encodeURIComponent(fileName.replace(/\.[^/.]+$/, ""));

  // Insert fl_attachment:filename right after /upload/
  // This forces browser to download with the original filename
  if (url.includes("/upload/")) {
    if (url.includes("fl_attachment")) {
      // Already has fl_attachment, return as is
      return url;
    }
    return url.replace("/upload/", `/upload/fl_attachment:${cleanFileName}/`);
  }
  return url;
}
