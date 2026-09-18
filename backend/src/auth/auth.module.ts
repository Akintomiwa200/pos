import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { StaffModule } from "../staff/staff.module";
import { ConsoleModule } from "../console/console.module";

@Module({
  imports: [StaffModule, ConsoleModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
