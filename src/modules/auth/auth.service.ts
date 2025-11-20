import bcrypt from "bcrypt";
import { AppError } from "../../shared/utils/appError";
import { IUserRepository, UserRecord } from "./auth.repository";
import { LoginDto, RegisterDto } from "./auth.schema";
import { tokenManager } from "../../shared/utils/tokenManager";

const SALT_ROUNDS = 10;

export interface AuthResponse {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
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

    const passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
    const user = await this.userRepository.create({
      email: payload.email,
      passwordHash,
    });

    return this.issueTokens(user);
  }

  async login(payload: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(payload.email);
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const isMatch = await bcrypt.compare(payload.password, user.password_hash);
    if (!isMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    return this.issueTokens(user);
  }

  private async issueTokens(user: UserRecord): Promise<AuthResponse> {
    const accessToken = tokenManager.signAccessToken(user.id);
    const refreshToken = tokenManager.signRefreshToken(user.id);
    const refreshHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await this.userRepository.updateRefreshTokenHash(user.id, refreshHash);

    return {
      userId: user.id,
      email: user.email,
      accessToken,
      refreshToken,
    };
  }
}
