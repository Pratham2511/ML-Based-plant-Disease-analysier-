declare module '@react-oauth/google' {
  import { FC, ReactNode } from 'react';

  export type CredentialResponse = {
    credential?: string;
  };

  export const GoogleOAuthProvider: FC<{ clientId: string; children: ReactNode }>;
  export const GoogleLogin: FC<{
    onSuccess: (response: CredentialResponse) => void;
    onError?: () => void;
    useOneTap?: boolean;
    theme?: string;
    shape?: string;
    size?: string;
    text?: string;
  }>;
}

declare module '@capacitor/core' {
  export type PluginListenerHandle = {
    remove: () => void | Promise<void>;
  };

  export const Capacitor: {
    isNativePlatform: () => boolean;
  };
}

declare module '@capacitor/app' {
  import { PluginListenerHandle } from '@capacitor/core';

  export const App: {
    addListener: (
      eventName: 'appUrlOpen',
      listenerFunc: (event: { url: string }) => void | Promise<void>
    ) => Promise<PluginListenerHandle>;
  };
}

declare module '@capacitor/browser' {
  export const Browser: {
    open: (options: { url: string; presentationStyle?: string }) => Promise<void>;
    close: () => Promise<void>;
  };
}
