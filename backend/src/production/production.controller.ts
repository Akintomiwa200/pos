import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ProductionService } from "./production.service";
import type {
  ProductionBatch,
  ProductionDeviation,
  ProductionRecipe,
  ProductionWaste,
} from "./production.types";

@Controller("production")
export class ProductionController {
  constructor(private readonly production: ProductionService) {}

  @Get()
  snapshot() {
    return this.production.snapshot();
  }

  @Get("batches")
  listBatches() {
    return this.production.listBatches();
  }

  @Post("batches")
  saveBatch(@Body() body: Partial<ProductionBatch>) {
    return this.production.saveBatch(body ?? {});
  }

  @Delete("batches/:id")
  deleteBatch(@Param("id") id: string) {
    return this.production.deleteBatch(id);
  }

  @Get("recipes")
  listRecipes() {
    return this.production.listRecipes();
  }

  @Post("recipes")
  saveRecipe(@Body() body: Partial<ProductionRecipe>) {
    return this.production.saveRecipe(body ?? {});
  }

  @Delete("recipes/:id")
  deleteRecipe(@Param("id") id: string) {
    return this.production.deleteRecipe(id);
  }

  @Get("deviations")
  listDeviations() {
    return this.production.listDeviations();
  }

  @Post("deviations")
  saveDeviation(@Body() body: Partial<ProductionDeviation>) {
    return this.production.saveDeviation(body ?? {});
  }

  @Delete("deviations/:id")
  deleteDeviation(@Param("id") id: string) {
    return this.production.deleteDeviation(id);
  }

  @Get("waste")
  listWaste() {
    return this.production.listWaste();
  }

  @Post("waste")
  saveWaste(@Body() body: Partial<ProductionWaste>) {
    return this.production.saveWaste(body ?? {});
  }

  @Delete("waste/:id")
  deleteWaste(@Param("id") id: string) {
    return this.production.deleteWaste(id);
  }
}