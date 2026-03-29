import { Download, Share2, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isLikelyIos(): boolean {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return false;
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

const LS_DISMISS_CHROME = 'radar_pwa_install_dismiss';
const LS_DISMISS_IOS = 'radar_pwa_ios_tip_dismiss';

/**
 * Barra ao abrir o app: instalação via prompt do Chrome/Edge/Android ou instruções para iOS (Safari).
 */
const InstallAppCta: React.FC = () => {
  const [standalone, setStandalone] = useState(() => isStandaloneDisplay());
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissChrome, setDismissChrome] = useState(() => localStorage.getItem(LS_DISMISS_CHROME) === '1');
  const [dismissIos, setDismissIos] = useState(() => localStorage.getItem(LS_DISMISS_IOS) === '1');

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const onInstallClick = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
  }, [deferred]);

  const dismissChromeBar = useCallback(() => {
    setDismissChrome(true);
    localStorage.setItem(LS_DISMISS_CHROME, '1');
  }, []);

  const dismissIosBar = useCallback(() => {
    setDismissIos(true);
    localStorage.setItem(LS_DISMISS_IOS, '1');
  }, []);

  if (standalone) return null;

  const showChromeInstall = Boolean(deferred) && !dismissChrome;
  const showIosTip = isLikelyIos() && !dismissIos && !deferred;

  if (!showChromeInstall && !showIosTip) return null;

  return (
    <div className="border-b border-emerald-800/15 bg-gradient-to-r from-[#0f2726]/[0.07] via-teal-900/10 to-[#0f2726]/[0.07] px-4 py-2.5 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {showChromeInstall ? (
          <>
            <p className="text-sm text-gray-800 font-semibold leading-snug">
              Instale o <span className="text-emerald-900">Radar de Cria</span> como app — abre rápido e funciona offline
              parcial.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onInstallClick}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-4 py-2 text-sm font-black text-white shadow-md shadow-emerald-900/20 hover:bg-emerald-900 active:scale-[0.98] transition"
              >
                <Download className="w-4 h-4" />
                Baixar / instalar
              </button>
              <button
                type="button"
                onClick={dismissChromeBar}
                className="p-2 rounded-full text-gray-500 hover:bg-white/60 hover:text-gray-800"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-800 font-medium leading-snug flex items-start gap-2">
              <Share2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-800" />
              <span>
                No <strong>iPhone/iPad</strong>: toque em <strong>Compartilhar</strong>{' '}
                <span className="whitespace-nowrap">(□↑)</span> e depois{' '}
                <strong>Adicionar à Tela de Início</strong> para instalar o Mapa do Tesouro.
              </span>
            </p>
            <button
              type="button"
              onClick={dismissIosBar}
              className="self-end sm:self-center p-2 rounded-full text-gray-500 hover:bg-white/60"
              aria-label="Fechar dica"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default InstallAppCta;
