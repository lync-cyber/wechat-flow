import { jwtVerify } from "jose";

/**
 * Resolves a Bearer token to either an editor session or a long-term API key.
 */
export interface TokenResolverDeps {
  secret: Uint8Array;
  sessionStore: {
    isRevoked(sessionId: string): Promise<boolean>;
  };
  clock: () => number;
}

export interface ResolvedToken {
  valid: boolean;
  iss: string | undefined;
  sub?: string;
  scope?: string;
  sessionId?: string;
}

export async function resolveBearer(
  token: string,
  deps: TokenResolverDeps
): Promise<ResolvedToken> {
  try {
    const { payload } = await jwtVerify(token, deps.secret, {
      currentDate: new Date(deps.clock()),
    });

    if (payload.iss !== "editor") {
      return { valid: false, iss: payload.iss };
    }

    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : undefined;
    if (sessionId) {
      const revoked = await deps.sessionStore.isRevoked(sessionId);
      if (revoked) {
        return { valid: false, iss: "editor" };
      }
    }

    return {
      valid: true,
      iss: "editor",
      sub: typeof payload.sub === "string" ? payload.sub : undefined,
      scope: typeof payload.scope === "string" ? payload.scope : undefined,
      sessionId,
    };
  } catch {
    return { valid: false, iss: undefined };
  }
}
