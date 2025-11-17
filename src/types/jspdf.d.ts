// Definiciones de tipos para jsPDF
declare global {
  interface Window {
    jsPDF: any;
    jspdf: any;
  }
}

// Definiciones básicas para jsPDF
declare const jsPDF: {
  new(): any;
  API: any;
};

export {};