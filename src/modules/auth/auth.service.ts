import { createHash } from "crypto";
import { AppError } from "../../shared/utils/appError";
import { IUserRepository, UserRecord } from "./auth.repository";
import { LoginDto, RegisterDto } from "./auth.schema";

export interface AuthResponse {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface IAuthService {
  register(payload: RegisterDto): Promise<AuthResponse>;
  login(payload: LoginDto): Promise<AuthResponse>;
}

export class AuthService implements IAuthService {
  constructor(private readonly userRepository: IUserRepository) {}

  async register(payload: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.userRepository.findByEmail(payload.email);
    if (existingUser) {
      throw new AppError("Email already registered", 409);
    }

    const passwordHash = this.hashPassword(payload.password);
    const user = await this.userRepository.createUser({ ...payload, passwordHash });

    return this.toAuthResponse(user);
  }

  async login(payload: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(payload.email);
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const isMatch = this.hashPassword(payload.password) === user.password_hash;
    if (!isMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    return this.toAuthResponse(user);
  }

  private hashPassword(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  private toAuthResponse(user: UserRecord): AuthResponse {
    return {
      userId: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    };
  }
}

