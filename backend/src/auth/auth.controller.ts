import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() body: { username?: string; email?: string; password?: string }) {
    return this.authService.login(
      body.username ?? body.email ?? "",
      body.password ?? "",
    );
  }
}
