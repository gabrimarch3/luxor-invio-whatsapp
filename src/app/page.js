import React, { Suspense } from 'react';
import ChatComponent from '../components/ChatComponent'; // Assicurati che il percorso sia corretto

export default function Page() {
  return (
    <Suspense fallback={<div>Caricamento...</div>}>
      <ChatComponent />
    </Suspense>
  );
}
