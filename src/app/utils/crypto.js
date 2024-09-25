// utils/crypto.js

export function encryptCodiceSpotty(codiceSpotty) {
    return btoa(codiceSpotty); // Codifica Base64
  }
  
  export function decryptCodiceSpotty(encryptedCodiceSpotty) {
    try {
      return atob(encryptedCodiceSpotty); // Decodifica Base64
    } catch (e) {
      console.error('Decodifica Base64 fallita:', e);
      return null;
    }
  }
  