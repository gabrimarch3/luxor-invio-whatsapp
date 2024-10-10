// Importazione delle dipendenze necessarie
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, differenceInHours } from "date-fns";
import {
  ArrowDown,
  MessageCircle,
  ChevronLeft,
  Search,
  MoreVertical,
} from "lucide-react";

// Importazione dei componenti personalizzati
import ChatList from "./ChatList";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import TemplateDialog from "./TemplateDialog";

// Componente principale per la gestione della chat
export default function ChatComponent() {
  // Hooks per la gestione dei parametri di ricerca e del routing
  const searchParams = useSearchParams();
  const router = useRouter();
  const codicespottyParam = searchParams.get("codicespotty");

  // Stati per la gestione del cliente selezionato e del codice Spotty
  const [selectedClient, setSelectedClient] = useState(
    codicespottyParam || null
  );
  const codiceSpotty = selectedClient ? `spotty${selectedClient}` : null;

  // Stati per la gestione delle chat, dei messaggi e delle ricerche
  const [chats, setChats] = useState([]);
  const [altriClientiGruppo, setAltriClientiGruppo] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [contactSearch, setContactSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [isChatDisabled, setIsChatDisabled] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Riferimenti per la gestione dello scroll e della visualizzazione
  const chatListRef = useRef(null);
  const messagesRef = useRef(null);
  const bottomRef = useRef(null);

  // Stato per il dialogo dei template
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

  // Stati per la gestione dello scroll
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesEndRef = useRef(null);

  // Funzione per scorrere verso il basso della chat
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsAtBottom(true);
    setShowScrollButton(false);
  }, []);

  // Gestore dell'evento di scroll
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isBottom = scrollHeight - scrollTop === clientHeight;
    setIsAtBottom(isBottom);
    setShowScrollButton(!isBottom);
  }, []);

  // Effetto per il recupero delle chat all'avvio o al cambio del codice Spotty
  useEffect(() => {
    if (codiceSpotty) {
      fetchChats();
    }
  }, [codiceSpotty]);

  // Effetto per il recupero dei messaggi quando viene selezionata una chat
  useEffect(() => {
    if (selectedChat && codiceSpotty) {
      setMessages([]); // Resetta i messaggi quando cambia la chat
      fetchMessages(selectedChat);
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === selectedChat ? { ...chat, unreadCount: 0 } : chat
        )
      );
      setIsPolling(true); // Avvia il polling
    } else {
      setIsPolling(false); // Ferma il polling se non c'è una chat selezionata
    }

    return () => {
      setIsPolling(false); // Assicurati di fermare il polling quando il componente viene smontato
    };
  }, [selectedChat, codiceSpotty]);

  // Effetto per lo scroll automatico quando arrivano nuovi messaggi
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom, scrollToBottom]);

  // Funzione per recuperare le chat
  const fetchChats = async () => {
    try {
      const response = await fetch(`/api/chats?codice_spotty=${codiceSpotty}`);
      if (!response.ok) {
        throw new Error("Errore nel recupero delle chat");
      }
      const data = await response.json();
      setChats(data.chats);
      setAltriClientiGruppo(data.altriClientiGruppo || []);
    } catch (error) {
      console.error("Errore nel recupero delle chat:", error);
    }
  };

  // Funzione per recuperare i messaggi
  const fetchMessages = useCallback(async (mobile, lastMessageId = null) => {
    if (!codiceSpotty || !mobile) return;

    try {
      let url = `/api/messages?codice_spotty=${codiceSpotty}&mobile=${mobile}`;
      if (lastMessageId) {
        url += `&lastMessageId=${lastMessageId}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Errore nel recupero dei messaggi");
      }
      const data = await response.json();
      
      setMessages(prevMessages => {
        const newMessages = [...prevMessages, ...data];
        // Rimuovi duplicati basandoti sull'ID del messaggio
        return Array.from(new Map(newMessages.map(item => [item.id, item])).values());
      });

      // Aggiorna le chat con l'ultimo messaggio
      if (data.length > 0) {
        const lastMessage = data[data.length - 1];
        updateChat(mobile, lastMessage);
      }
    } catch (error) {
      console.error("Errore nel recupero dei messaggi:", error);
    }
  }, [codiceSpotty]);

  // Funzione per aggiornare una singola chat
  const updateChat = (mobile, lastMessage) => {
    setChats(prevChats => prevChats.map(chat => {
      if (chat.id === mobile) {
        return {
          ...chat,
          lastMessage: lastMessage.content,
          lastMessageTime: lastMessage.time,
          hasNewMessage: chat.id !== selectedChat && lastMessage.sender !== "Me",
        };
      }
      return chat;
    }));
  };

  // Effetto per il polling dei messaggi
  useEffect(() => {
    let pollingInterval;

    if (isPolling && selectedChat && codiceSpotty) {
      pollingInterval = setInterval(() => {
        const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
        fetchMessages(selectedChat, lastMessageId);
      }, 5000);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isPolling, selectedChat, codiceSpotty, messages, fetchMessages]);

  // Funzione per inviare un messaggio
  const handleSendMessage = async (
    messageContent,
    mediaUrl = null,
    mimeType = null
  ) => {
    const content = messageContent || messageInput;
    if (content.trim() === "" && !mediaUrl) return;

    const newMessage = {
      id: Date.now(),
      sender: "Me",
      content: content,
      media_url: mediaUrl,
      mime_type: mimeType,
      time: new Date().toISOString(),
      status: null,
      isSystem: false,
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);

    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === selectedChat
          ? {
              ...chat,
              lastMessage: newMessage.content || (mediaUrl ? "Media" : ""),
              lastMessageSender: "Me",
              lastMessageType: mimeType ? mimeType.split("/")[0] : "text",
              time: newMessage.time,
              hasNewMessage: false,
            }
          : chat
      )
    );

    try {
      const payload = {
        codice_spotty: codiceSpotty,
        mobile: selectedChat,
        message: content,
        media_url: mediaUrl,
        mime_type: mimeType,
      };

      const response = await fetch("/api/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Errore nell'invio del messaggio");
      }
      const data = await response.json();
      console.log("Messaggio inviato con successo:", data);
    } catch (error) {
      console.error("Errore nell'invio del messaggio:", error);
    }

    setMessageInput("");
    setIsChatDisabled(false);
    scrollToBottom();
  };

  // Funzione per tornare indietro dalla chat selezionata
  const handleBack = () => {
    setSelectedChat(null);
  };

  // Funzione per ottenere le iniziali da un nome
  const getInitials = (name) => {
    const validName = name || "S";
    return validName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Recupera i dati della chat selezionata
  const selectedChatData = Array.isArray(chats)
    ? chats.find((chat) => chat.id === selectedChat)
    : null;

  // Gestore per l'invio di un nuovo messaggio
  const handleMessageSent = (newMessage) => {
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === selectedChat
          ? {
              ...chat,
              lastMessage: newMessage.content || "Media",
              lastMessageSender: "Me",
              lastMessageType: newMessage.mime_type ? newMessage.mime_type.split("/")[0] : "text",
              time: newMessage.time,
            }
          : chat
      )
    );
    scrollToBottom();
  };

  // Gestore per la selezione di una chat
  const handleChatSelect = (chatId) => {
    setSelectedChat(chatId);
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === chatId ? { ...chat, hasNewMessage: false } : chat
      )
    );
  };

  // Renderizzazione del componente
  if (!codiceSpotty) {
    // Renderizza il form di inserimento del codice Spotty se non è presente
    const [spottyNumber, setSpottyNumber] = useState("");

    const handleSubmit = (e) => {
      e.preventDefault();
      if (spottyNumber) {
        window.location.href = `/?codicespotty=${spottyNumber}`;
      }
    };

    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-blue-50 to-white">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            Inserisci il Codice Spotty
          </h1>
          <form onSubmit={handleSubmit} className="flex items-center">
            <span className="text-gray-700 text-lg mr-2">spotty</span>
            <Input
              type="text"
              className="border border-gray-300 rounded-l px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Inserisci il numero"
              value={spottyNumber}
              onChange={(e) => setSpottyNumber(e.target.value)}
            />
            <Button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700 transition duration-200"
            >
              Vai
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Renderizza l'interfaccia principale della chat
  return (
    <div className="flex h-screen bg-[#f0f2f5]">
      {/* Sezione sinistra delle chat */}
      <ChatList
        chats={chats}
        contactSearch={contactSearch}
        setContactSearch={setContactSearch}
        selectedChat={selectedChat}
        setSelectedChat={handleChatSelect}
        setChats={setChats}
        chatListRef={chatListRef}
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
        router={router}
        codiceSpotty={codiceSpotty}
        altriClientiGruppo={altriClientiGruppo}
      />

      {/* Sezione destra dei messaggi */}
      <div
        className={`flex flex-col bg-[#efeae2] flex-grow h-full
              ${selectedChat ? "" : "hidden md:flex md:w-2/3"}`}
      >
        {selectedChat ? (
          <div className="flex flex-col h-full">
            {/* Barra del contatto */}
            <div className="flex-shrink-0 sticky top-0 z-10">
              <div className="bg-[#f0f2f5] p-2 flex items-center">
                {/* Pulsante indietro per mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[#54656f] mr-2 md:hidden"
                  onClick={handleBack}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10 mr-3">
                  {selectedChatData?.avatar ? (
                    <AvatarImage
                      src={selectedChatData.avatar}
                      alt={selectedChatData.name || "Sconosciuto"}
                    />
                  ) : (
                    <AvatarFallback className="bg-[#dfe5e7] text-[#54656f]">
                      {getInitials(selectedChatData?.name || "S")}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-grow">
                  <div className="font-semibold text-[#111b21]">
                    {selectedChatData?.name || "Sconosciuto"}
                  </div>
                </div>
                <div className="relative hidden md:block">
                  <Input
                    placeholder="Cerca nella chat"
                    className="pl-10 bg-white w-64"
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                  />
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#54656f]" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[#54656f] ml-2"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
              <div className="h-px bg-[#e9edef]" />
            </div>

            {/* Area scrollabile dei messaggi */}
            <div 
              className="flex-grow overflow-y-auto" 
              ref={messagesRef}
              onScroll={handleScroll}
            >
              <MessageList
                messages={messages}
                messageSearch={messageSearch}
                selectedChatData={selectedChatData}
              />
              <div ref={messagesEndRef} />
            </div>

            {/* Barra di input */}
            <ChatInput
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              isChatDisabled={isChatDisabled}
              handleSendMessage={handleSendMessage}
              isTemplateDialogOpen={isTemplateDialogOpen}
              setIsTemplateDialogOpen={setIsTemplateDialogOpen}
              codiceSpotty={codiceSpotty}
              selectedChat={selectedChat}
              scrollToBottom={scrollToBottom}
              onMessageSent={handleMessageSent}
            />

            {/* Pulsante per scorrere verso il basso */}
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="fixed bottom-20 right-6 bg-[#25d366] text-white p-3 rounded-full shadow-lg hover:bg-[#1da851] transition"
                aria-label="Torna all'ultimo messaggio"
              >
                <ArrowDown className="w-6 h-6" />
              </button>
            )}
          </div>
        ) : (
          // Messaggio di benvenuto quando nessuna chat è selezionata
          <div className="flex flex-col items-center justify-center h-full bg-[#f0f2f5]">
            <div className="w-20 h-20 bg-[#25d366] rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <p className="text-lg text-[#41525d] text-center px-4">
              Seleziona una chat per iniziare la conversazione
            </p>
          </div>
        )}
      </div>
    </div>
  );
}