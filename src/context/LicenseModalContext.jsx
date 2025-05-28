// src/context/LicenseModalContext.js
import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const LicenseModalContext = createContext(null);

export function LicenseModalProvider({ children }) {
  // `beat` holds the selected beat when open, null when closed
  const [beat, setBeat] = useState(null);

  const openLicenseModal = useCallback((selectedBeat) => {
    // normalize id (prefer .id, fall back to .beatId)
    const normalizedId = selectedBeat.id ?? selectedBeat.beatId;

    setBeat({
      ...selectedBeat,
      id: normalizedId,
    });
  }, []);

  const closeLicenseModal = useCallback(() => {
    setBeat(null);
  }, []);

  const isOpen = beat !== null;

  const value = useMemo(() => ({
    isOpen,
    beat,
    openLicenseModal,
    closeLicenseModal
  }), [isOpen, beat, openLicenseModal, closeLicenseModal]);

  return (
    <LicenseModalContext.Provider value={value}>
      {children}
    </LicenseModalContext.Provider>
  );
}

export function useLicenseModal() {
  const context = useContext(LicenseModalContext);
  if (!context) {
    throw new Error('useLicenseModal must be used within a LicenseModalProvider');
  }
  return context;
}
