import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { StaffModule } from "../staff/staff.module";

@Module({
  imports: [StaffModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
