import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { CloudinaryService } from "./cloudinary.service";

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CloudinaryService],
  exports: [CatalogService, CloudinaryService],
})
export class CatalogModule {}
