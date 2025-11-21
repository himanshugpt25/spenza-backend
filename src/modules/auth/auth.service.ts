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
  refresh(refreshToken: string): Promise<AuthResponse>;
  getSessionStatus(
    accessToken?: string,
    refreshToken?: string
  ): Promise<SessionStatus>;
}

interface SessionActive {
  state: "active";
  user: UserRecord;
}

interface SessionRefreshed {
  state: "refreshed";
  user: UserRecord;
  accessToken: string;
}

interface SessionLogout {
  state: "logout";
}

type SessionStatus = SessionActive | SessionRefreshed | SessionLogout;

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

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const user = await this.validateRefreshToken(refreshToken);
    return this.issueTokens(user);
  }

  async getSessionStatus(
    accessToken?: string,
    refreshToken?: string
  ): Promise<SessionStatus> {
    if (!accessToken && !refreshToken) {
      return { state: "logout" };
    }

    if (accessToken) {
      try {
        const payload = tokenManager.verifyAccessToken(accessToken);
        const user = await this.userRepository.findById(payload.sub);
        if (!user) {
          return { state: "logout" };
        }
        return { state: "active", user };
      } catch (error) {
        if (
          error instanceof Error &&
          "name" in error &&
          error.name === "TokenExpiredError" &&
          refreshToken
        ) {
          return this.refreshWithExistingToken(refreshToken);
        }
        return { state: "logout" };
      }
    }

    if (refreshToken) {
      return this.refreshWithExistingToken(refreshToken);
    }

    return { state: "logout" };
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

  private async validateRefreshToken(
    refreshToken?: string
  ): Promise<UserRecord> {
    if (!refreshToken) {
      throw new AppError("Missing refresh token", 401);
    }

    try {
      const payload = tokenManager.verifyRefreshToken(refreshToken);
      const user = await this.userRepository.findById(payload.sub);
      if (!user || !user.refresh_token_hash) {
        throw new AppError("Invalid refresh token", 401);
      }

      const matches = await bcrypt.compare(
        refreshToken,
        user.refresh_token_hash
      );
      if (!matches) {
        throw new AppError("Invalid refresh token", 401);
      }

      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Invalid or expired refresh token", 401);
    }
  }

  private async refreshWithExistingToken(
    refreshToken: string
  ): Promise<SessionStatus> {
    try {
      const user = await this.validateRefreshToken(refreshToken);
      const accessToken = tokenManager.signAccessToken(user.id);
      return { state: "refreshed", user, accessToken };
    } catch {
      return { state: "logout" };
    }
  }
}
