import { BadRequestException, Injectable } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";

export const MAX_PRODUCT_IMAGE_BYTES = 1024 * 1024;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

@Injectable()
export class CloudinaryService {
  configured() {
    return Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET,
    );
  }

  private ensureConfigured() {
    if (!this.configured()) {
      throw new BadRequestException(
        "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the backend.",
      );
    }
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  assertUpload(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Choose an image file to upload.");
    }
    if (file.size > MAX_PRODUCT_IMAGE_BYTES || file.buffer.length > MAX_PRODUCT_IMAGE_BYTES) {
      throw new BadRequestException("Product images must be 1 MB or smaller.");
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException("Use JPG, PNG, WebP, or GIF for product images.");
    }
  }

  uploadProductImage(file: Express.Multer.File, itemId: string) {
    this.ensureConfigured();
    this.assertUpload(file);

    return new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "pos/products",
          public_id: `product-${itemId}`,
          overwrite: true,
          invalidate: true,
          resource_type: "image",
          transformation: [
            { width: 900, height: 900, crop: "limit" },
            { quality: "auto:good" },
            { fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error || !result?.secure_url) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }
          resolve(result.secure_url);
        },
      );
      stream.end(file.buffer);
    });
  }
}
