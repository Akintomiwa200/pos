import { Injectable, UnauthorizedException } from "@nestjs/common";
import { StaffService } from "../staff/staff.service";
import { ConsoleService } from "../console/console.service";
import { fromConsoleUser } from "../staff/web-user";
import { isSellOnly, publicStaff } from "../staff/staff.types";

@Injectable()
export class AuthService {
  constructor(
    private readonly staff: StaffService,
    private readonly console: ConsoleService,
  ) {}

  async login(username: string, password: string) {
    try {
      return await this.staff.login(username, password);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) throw error;
    }
    const session = await this.console.login(username, password);
    const user = fromConsoleUser(session.user);
    if (!user) {
      throw new UnauthorizedException("This web account cannot open the till.");
    }
    return {
      token: `web-${session.token}`,
      user: publicStaff(user),
      needsOpenShift: isSellOnly(user),
    };
  }

  loginWithPin(staffId: string, pin: string) {
    return this.staff.loginWithPin(staffId, pin);
  }
}