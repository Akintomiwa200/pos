import { Injectable } from "@nestjs/common";
import { StaffService } from "../staff/staff.service";

@Injectable()
export class AuthService {
  constructor(private readonly staff: StaffService) {}

  login(username: string, password: string) {
    return this.staff.login(username, password);
  }
}
