declare module 'passport-kakao' {
  import { Strategy as PassportStrategy } from 'passport';

  export interface Profile {
    id: string | number;
    displayName: string;
    _json: unknown;
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret?: string;
    callbackURL: string;
  }

  export class Strategy extends PassportStrategy {
    constructor(
      options: StrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: unknown) => void,
      ) => void,
    );
  }
}
