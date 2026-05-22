interface KakaoSDK {
  init(appKey: string): void;
  isInitialized(): boolean;
  Auth: {
    authorize(options: {
      redirectUri: string;
      scope?: string;
      state?: string;
    }): void;
  };
}
