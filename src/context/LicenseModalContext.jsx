import { createContext, useContext, useState } from 'react';

const LicenseModalContext = createContext();

export function LicenseModalProvider({ children }) {
  const [selectedBeat, setSelectedBeat] = useState(null);

  const openLicenseModal = (beat) => setSelectedBeat(beat);
  const closeLicenseModal = () => setSelectedBeat(null);

  return (
    <LicenseModalContext.Provider value={{ selectedBeat, openLicenseModal, closeLicenseModal }}>
      {children}
    </LicenseModalContext.Provider>
  );
}

export function useLicenseModal() {
  return useContext(LicenseModalContext);
}
