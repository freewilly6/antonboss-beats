import { createContext, useContext, useState } from 'react';

const LicenseModalContext = createContext();

export function LicenseModalProvider({ children }) {
  // `beat` holds the selected beat when open, null when closed
  const [beat, setBeat] = useState(null);

  const openLicenseModal  = (selectedBeat) => setBeat(selectedBeat);
  const closeLicenseModal = () => setBeat(null);

  const isOpen = beat !== null;

  return (
    <LicenseModalContext.Provider
      value={{ isOpen, beat, openLicenseModal, closeLicenseModal }}
    >
      {children}
    </LicenseModalContext.Provider>
  );
}

export function useLicenseModal() {
  return useContext(LicenseModalContext);
}
