import { Request, Response, CookieOptions } from "express";
import { IAuthService } from "./auth.service";
import { RegisterDto, LoginDto } from "./auth.schema";
import { formatSuccess } from "../../shared/utils/responseFormatter";
import { config } from "../../config/config";

export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  signup = async (req: Request, res: Response) => {
    const payload = req.body as RegisterDto;
    const result = await this.authService.register(payload);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(201).json(
      formatSuccess(
        {
          userId: result.userId,
          email: result.email,
        },
        "User registered"
      )
    );
  };

  login = async (req: Request, res: Response) => {
    const payload = req.body as LoginDto;
    const result = await this.authService.login(payload);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(200).json(
      formatSuccess(
        {
          userId: result.userId,
          email: result.email,
        },
        "Authenticated"
      )
    );
  };

  refresh = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.["spenza-refreshToken"];
    const result = await this.authService.refresh(refreshToken);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(200).json(
      formatSuccess(
        {
          userId: result.userId,
          email: result.email,
        },
        "Tokens refreshed"
      )
    );
  };

  status = async (req: Request, res: Response) => {
    const accessToken = this.getAccessToken(req);
    const refreshToken = req.cookies?.["spenza-refreshToken"];
    const session = await this.authService.getSessionStatus(
      accessToken,
      refreshToken
    );

    if (session.state === "logout") {
      this.clearAuthCookies(res);
      return res
        .status(401)
        .json(formatSuccess({ isAuthenticated: false }, "Logged out"));
    }

    if (session.state === "refreshed") {
      this.setAuthCookies(res, session.accessToken);
      return res.status(200).json(
        formatSuccess(
          {
            userId: session.user.id,
            email: session.user.email,
            isAuthenticated: true,
            refreshed: true,
          },
          "Session refreshed"
        )
      );
    }

    return res.status(200).json(
      formatSuccess(
        {
          userId: session.user.id,
          email: session.user.email,
          isAuthenticated: true,
          refreshed: false,
        },
        "Session active"
      )
    );
  };

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken?: string
  ) {
    const isProd = config.isProduction;
    const sameSite: CookieOptions["sameSite"] = isProd ? "strict" : "lax";
    const baseOptions: CookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite,
      maxAge: this.parseDuration(config.JWT_EXPIRES_IN),
    };
    res.cookie("spenza-accessToken", accessToken, baseOptions);

    if (refreshToken) {
      res.cookie("spenza-refreshToken", refreshToken, {
        ...baseOptions,
        maxAge: this.parseDuration(config.JWT_REFRESH_EXPIRES_IN),
      });
    }
  }

  private clearAuthCookies(res: Response) {
    const isProd = config.isProduction;
    const sameSite: CookieOptions["sameSite"] = isProd ? "strict" : "lax";
    const options: CookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite,
      maxAge: 0,
    };
    res.cookie("spenza-accessToken", "", options);
    res.cookie("spenza-refreshToken", "", options);
  }

  private getAccessToken(req: Request): string | undefined {
    const authorization = req.headers.authorization;
    if (authorization?.startsWith("Bearer ")) {
      return authorization.split(" ")[1];
    }
    return req.cookies?.["spenza-accessToken"];
  }

  private parseDuration(value: string): number {
    if (value.endsWith("ms")) {
      return Number(value.replace("ms", ""));
    }
    const unit = value.slice(-1);
    const amount = Number(value.slice(0, -1));
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return amount * (multipliers[unit] ?? 1000);
  }
}
