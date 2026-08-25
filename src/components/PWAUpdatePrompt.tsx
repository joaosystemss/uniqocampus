import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "@/components/ui/sonner";
import { useEffect, useRef } from "react";

export function PWAUpdatePrompt() {
  const updateIntervalRef = useRef<number | null>(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration || updateIntervalRef.current !== null) return;

      updateIntervalRef.current = window.setInterval(() => {
        registration.update();
      }, 60 * 1000);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;

    toast("Nova atualização disponível!", {
      id: "pwa-update-toast",
      description: "Clique para atualizar o app",
      duration: Infinity,
      action: {
        label: "Atualizar",
        onClick: () => updateServiceWorker(true),
      },
    });
  }, [needRefresh, updateServiceWorker]);

  useEffect(() => {
    return () => {
      if (updateIntervalRef.current !== null) {
        window.clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return null;
}
