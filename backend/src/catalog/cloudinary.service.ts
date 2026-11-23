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

  assertUpload(file: Express.Multer.File, label = "Product images") {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Choose an image file to upload.");
    }
    if (file.size > MAX_PRODUCT_IMAGE_BYTES || file.buffer.length > MAX_PRODUCT_IMAGE_BYTES) {
      throw new BadRequestException(`${label} must be 1 MB or smaller.`);
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(`Use JPG, PNG, WebP, or GIF for ${label.toLowerCase()}.`);
    }
  }

  private uploadImage(
    file: Express.Multer.File,
    options: { folder: string; publicId: string; transformation: Record<string, unknown>[] },
  ) {
    return new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          public_id: options.publicId,
          overwrite: true,
          invalidate: true,
          resource_type: "image",
          transformation: options.transformation,
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

  uploadProductImage(file: Express.Multer.File, itemId: string) {
    this.ensureConfigured();
    this.assertUpload(file);
    return this.uploadImage(file, {
      folder: "pos/products",
      publicId: `product-${itemId}`,
      transformation: [
        { width: 900, height: 900, crop: "limit" },
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });
  }

  uploadAvatar(file: Express.Multer.File, accountId: string) {
    this.ensureConfigured();
    this.assertUpload(file, "Profile pictures");
    return this.uploadImage(file, {
      folder: "pos/avatars",
      publicId: `avatar-${accountId}`,
      transformation: [
        { width: 512, height: 512, crop: "fill", gravity: "face" },
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });
  }

  uploadCompanyLogo(file: Express.Multer.File, companyId: string) {
    this.ensureConfigured();
    this.assertUpload(file, "Company images");
    return this.uploadImage(file, {
      folder: "pos/company",
      publicId: `logo-${companyId || "current"}`,
      transformation: [
        { width: 512, height: 512, crop: "limit" },
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });
  }
}
