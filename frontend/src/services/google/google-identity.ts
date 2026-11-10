export type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentityApi = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: Record<string, unknown>,
      ) => void;
      disableAutoSelect: () => void;
      cancel: () => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

let loading: Promise<GoogleIdentityApi> | null = null;

export function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  if (window.google) {
    return Promise.resolve(window.google);
  }

  if (loading) {
    return loading;
  }

  loading = new Promise<GoogleIdentityApi>((resolve, reject) => {
    const script = document.createElement('script');
    // `hl` define o idioma do botão; sem ele o Google usa o idioma da conta.
    script.src = 'https://accounts.google.com/gsi/client?hl=pt-BR';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        resolve(window.google);
        return;
      }

      loading = null;
      reject(new Error('Google Identity Services indisponível.'));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error('Falha ao carregar o Google Identity Services.'));
    };
    document.head.appendChild(script);
  });

  return loading;
}
