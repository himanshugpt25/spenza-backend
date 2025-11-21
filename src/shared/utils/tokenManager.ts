import jwt, { JwtPayload, VerifyOptions } from "jsonwebtoken";
import type { StringValue } from "ms";
import { config } from "../../config/config";

interface TokenClaims extends JwtPayload {
  sub: string;
}

const sign = (payload: TokenClaims, secret: string, expiresIn: string) =>
  jwt.sign(payload, secret, { expiresIn: expiresIn as StringValue });

const verify = (
  token: string,
  secret: string,
  options?: VerifyOptions
): TokenClaims => jwt.verify(token, secret, options) as TokenClaims;

export const tokenManager = {
  signAccessToken(userId: string): string {
    return sign({ sub: userId }, config.JWT_SECRET, config.JWT_EXPIRES_IN);
  },

  signRefreshToken(userId: string): string {
    return sign(
      { sub: userId },
      config.JWT_REFRESH_SECRET,
      config.JWT_REFRESH_EXPIRES_IN
    );
  },

  verifyAccessToken(token: string, options?: VerifyOptions): TokenClaims {
    return verify(token, config.JWT_SECRET, options);
  },

  verifyRefreshToken(token: string, options?: VerifyOptions): TokenClaims {
    return verify(token, config.JWT_REFRESH_SECRET, options);
  },
};
