import { Request, Response } from "express";
import { IAuthService } from "./auth.service";
import { RegisterDto, LoginDto } from "./auth.schema";
import { formatSuccess } from "../../shared/utils/responseFormatter";

export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  signup = async (req: Request, res: Response) => {
    const payload = req.body as RegisterDto;
    const result = await this.authService.register(payload);
    res.status(201).json(formatSuccess(result, "User registered"));
  };

  login = async (req: Request, res: Response) => {
    const payload = req.body as LoginDto;
    const result = await this.authService.login(payload);
    res.status(200).json(formatSuccess(result, "Authenticated"));
  };
}
