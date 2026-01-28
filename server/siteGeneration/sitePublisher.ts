import { Storage } from "@google-cloud/storage";
import type { SiteBundle } from "./siteBuilder";

// Initialize Google Cloud Storage client with standard authentication
// Uses GOOGLE_APPLICATION_CREDENTIALS env var or GCP metadata service
const storageClient = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
});

function getPublicBasePath(): string {
  const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
  const paths = pathsStr
    .split(",")
    .map((path) => path.trim())
    .filter((path) => path.length > 0);

  if (paths.length === 0) {
    throw new Error(
      "PUBLIC_OBJECT_SEARCH_PATHS not set. Set up a GCS bucket " +
        "and configure PUBLIC_OBJECT_SEARCH_PATHS env var."
    );
  }

  return paths[0];
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

export async function publishSiteBundle(
  siteId: string,
  bundle: SiteBundle
): Promise<{ previewUrl: string }> {
  const basePath = getPublicBasePath();
  const sitePath = `${basePath}/sites/${siteId}`;
  const { bucketName } = parseObjectPath(sitePath);
  const bucket = storageClient.bucket(bucketName);

  console.log(`[SitePublisher] Starting publish for site ${siteId}`);
  console.log(`[SitePublisher] Publishing ${bundle.files.length} files to ${sitePath}`);

  const uploadPromises = bundle.files.map(async (file) => {
    const fullPath = `${sitePath}/${file.path}`;
    const { objectName } = parseObjectPath(fullPath);
    const objectFile = bucket.file(objectName);

    try {
      await objectFile.save(file.content, {
        contentType: file.contentType,
        metadata: {
          cacheControl: "public, max-age=3600",
        },
      });
      console.log(`[SitePublisher] Uploaded: ${file.path}`);
    } catch (error) {
      console.error(`[SitePublisher] Failed to upload ${file.path}:`, error);
      throw error;
    }
  });

  try {
    await Promise.all(uploadPromises);
    console.log(`[SitePublisher] Successfully published all files for site ${siteId}`);
  } catch (error) {
    console.error(`[SitePublisher] Failed to publish site ${siteId}:`, error);
    throw new Error(`Failed to publish site bundle: ${error instanceof Error ? error.message : String(error)}`);
  }

  const previewUrl = `/public-objects/sites/${siteId}/index.html`;
  console.log(`[SitePublisher] Site available at: ${previewUrl}`);

  return { previewUrl };
}

export async function uploadSiteAsset(
  siteId: string,
  assetType: "logo" | "hero" | "image",
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  const basePath = getPublicBasePath();
  const assetPath = `${basePath}/sites/${siteId}/assets/${assetType}`;
  const fullPath = `${assetPath}/${filename}`;
  const { bucketName, objectName } = parseObjectPath(fullPath);

  const bucket = storageClient.bucket(bucketName);
  const objectFile = bucket.file(objectName);

  const contentType = getContentTypeFromFilename(filename);

  console.log(`[SitePublisher] Uploading ${assetType} asset: ${filename}`);

  try {
    await objectFile.save(imageBuffer, {
      contentType,
      metadata: {
        cacheControl: "public, max-age=86400",
      },
    });
    console.log(`[SitePublisher] Successfully uploaded asset: ${filename}`);
  } catch (error) {
    console.error(`[SitePublisher] Failed to upload asset ${filename}:`, error);
    throw new Error(`Failed to upload site asset: ${error instanceof Error ? error.message : String(error)}`);
  }

  const publicUrl = `/public-objects/sites/${siteId}/assets/${assetType}/${filename}`;
  return publicUrl;
}

function getContentTypeFromFilename(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}
