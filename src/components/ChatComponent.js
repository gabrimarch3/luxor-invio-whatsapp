'use client'; // Specifica che questo è un Client Component

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation'; // Importa useSearchParams
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageCircle,
  Search,
  MoreVertical,
  ChevronLeft,
  Check,
  CheckCheck,
  ArrowDown, // Icona per il pulsante
} from 'lucide-react'; // Icone per gli indicatori di stato
import { format, isToday, isYesterday } from 'date-fns'; // Per la formattazione delle date
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Plugin per supportare GitHub Flavored Markdown
import debounce from 'lodash.debounce'; // Per ottimizzazione dello scroll

export default function ChatComponent() {
  const searchParams = useSearchParams();
  const codicespottyParam = searchParams.get('codicespotty'); // Ottieni 'codicespotty' dall'URL
  const codiceSpotty = codicespottyParam ? `spotty${codicespottyParam}` : null;

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false); // Stato per mostrare/nascondere il pulsante

  // Crea riferimenti separati
  const chatListRef = useRef(null); // Se necessario per la lista delle chat
  const messagesRef = useRef(null); // Per la sezione dei messaggi
  const bottomRef = useRef(null); // Riferimento per scrollare all'ultimo messaggio

  useEffect(() => {
    if (codiceSpotty) {
      console.log('codice_spotty:', codiceSpotty); // Log per debugging
      fetchChats();
    } else {
      console.log('codice_spotty non trovato nell\'URL');
    }
  }, [codiceSpotty]);

  useEffect(() => {
    if (selectedChat && codiceSpotty) {
      console.log('Fetching messages for chat:', selectedChat, 'with codice_spotty:', codiceSpotty); // Log per debugging
      fetchMessages(selectedChat);
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === selectedChat ? { ...chat, unreadCount: 0 } : chat
        )
      );
    }
  }, [selectedChat, codiceSpotty]);

  // Usa useLayoutEffect per assicurarsi che lo scroll avvenga dopo che il DOM è stato aggiornato
  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const scrollContainer = messagesRef.current;

    if (!scrollContainer) return;

    const handleScroll = debounce(() => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50; // Tolleranza di 50px

      setShowScrollButton(!isAtBottom);
    }, 200); // Debounce di 200ms

    scrollContainer.addEventListener('scroll', handleScroll);

    // Cleanup
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      handleScroll.cancel();
    };
  }, [messages]);

  const fetchChats = async () => {
    try {
      const response = await fetch(`https://welcome.spottywifi.app/concierge/chatbot/chats.php?codice_spotty=${encodeURIComponent(codiceSpotty)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Errore HTTP! status: ${response.status} - ${errorData.message}`
        );
      }
      const data = await response.json();
      console.log("Dati ricevuti dall'API chats.php:", data);
      setChats(data);
    } catch (error) {
      console.error('Errore nel recupero delle chat:', error);
      setChats([]); // Imposta chats come array vuoto in caso di errore
    }
  };

  const fetchMessages = async (mobile) => {
    try {
      const response = await fetch(
        `https://welcome.spottywifi.app/concierge/chatbot/messages.php?codice_spotty=${encodeURIComponent(codiceSpotty)}&mobile=${encodeURIComponent(mobile)}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Errore HTTP! status: ${response.status} - ${errorData.message}`
        );
      }
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Errore nel recupero dei messaggi:', error);
      setMessages([]); // Imposta messages come array vuoto in caso di errore
    }
  };

  const filteredChats = Array.isArray(chats)
    ? chats.filter((chat) =>
        (chat.name || '').toLowerCase().includes(contactSearch.toLowerCase())
      )
    : [];

  const filteredMessages = Array.isArray(messages)
    ? messages.filter((message) =>
        message.content.toLowerCase().includes(messageSearch.toLowerCase())
      )
    : [];

  const getInitials = (name) => {
    const validName = name || 'S';
    return validName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const truncateMessage = (message, maxLength) => {
    return message.length > maxLength
      ? message.substring(0, maxLength) + '...'
      : message;
  };

  const selectedChatData = chats.find((chat) => chat.id === selectedChat);

  const handleBack = () => {
    setSelectedChat(null);
  };

  // Funzione per raggruppare i messaggi per data
  const groupMessagesByDate = (messages) => {
    const groupedMessages = [];
    messages.forEach((message) => {
      const messageDate = new Date(message.time);
      let dateLabel = '';
      if (isToday(messageDate)) {
        dateLabel = 'Oggi';
      } else if (isYesterday(messageDate)) {
        dateLabel = 'Ieri';
      } else {
        dateLabel = format(messageDate, 'dd/MM/yyyy');
      }

      // Trova se questa data esiste già in groupedMessages
      const dateGroup = groupedMessages.find(
        (group) => group.dateLabel === dateLabel
      );
      if (dateGroup) {
        dateGroup.messages.push(message);
      } else {
        groupedMessages.push({
          dateLabel,
          messages: [message],
        });
      }
    });
    return groupedMessages;
  };

  // Processa i messaggi per includere i gruppi di date
  const groupedMessages = groupMessagesByDate(filteredMessages);

  // Funzione per gestire le sequenze di escape nei contenuti dei messaggi
  const unescapeMessageContent = (content) => {
    if (!content) return '';
    return content
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\'); // Gestisce le backslash
  };

  // Funzione per determinare se un messaggio è di sistema
  const isSystemMessage = (message) => {
    return message.isSystem;
  };

  // Funzione per sostituire i placeholder (es. {{1}}, {{2}}, ecc.)
  const replacePlaceholders = (content, replacements) => {
    if (!replacements) return content;
    let updatedContent = content;
    replacements.forEach((value, index) => {
      const placeholder = `{{${index + 1}}}`;
      updatedContent = updatedContent.replace(new RegExp(placeholder, 'g'), value);
    });
    return updatedContent;
  };

  // Esempio di dati per sostituzione (può essere dinamico in base all'utente)
  const userData = {
    1: 'Mirco',
    2: 'Ceccarini',
    3: 'Qualche altro dato',
    4: 'Un altro dato',
  };

  // Funzione per scorrere all'ultimo messaggio
  const scrollToBottom = () => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }

    // In alternativa, puoi utilizzare un elemento di ancoraggio
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Se codice_spotty non è presente, mostra un messaggio
  if (!codiceSpotty) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#f0f2f5]">
        <p className="text-lg text-[#41525d] text-center px-4">
          Codice Spotty non fornito. Per favore, fornisci un codice valido nell'URL.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f0f2f5]">
      {/* Sezione chat a sinistra */}
      <div
        className={`flex flex-col border-r border-[#d1d7db] bg-white 
              ${selectedChat ? 'hidden md:flex md:w-1/3' : 'w-full md:w-1/3'}`}
      >
        <div className="bg-[#f0f2f5] p-4">
          <div className="relative mb-4">
            <Input
              placeholder="Cerca o inizia una nuova chat"
              className="pl-10 bg-white"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
            />
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#54656f]" />
          </div>
        </div>
        <ScrollArea ref={chatListRef} className="flex-grow">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`flex items-center p-3 cursor-pointer hover:bg-[#f5f6f6] ${
                selectedChat === chat.id ? 'bg-[#f0f2f5]' : ''
              }`}
              onClick={() => setSelectedChat(chat.id)}
            >
              <Avatar className="h-12 w-12 mr-3 flex-shrink-0">
                {chat.avatar ? (
                  <AvatarImage src={chat.avatar} alt={chat.name || 'Sconosciuto'} />
                ) : (
                  <AvatarFallback className="bg-[#dfe5e7] text-[#54656f]">
                    {getInitials(chat.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-grow min-w-0">
                <div className="font-semibold text-[#111b21] truncate">
                  {chat.name || 'Sconosciuto'}
                </div>
                <div className="text-sm text-[#667781] truncate">
                  {truncateMessage(chat.lastMessage, 30)}
                </div>
              </div>
              <div className="flex flex-col items-end ml-2 flex-shrink-0">
                <div className="text-xs text-[#667781]">{chat.time}</div>
                {chat.unreadCount > 0 && (
                  <div className="bg-[#25d366] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mt-1">
                    {chat.unreadCount}
                  </div>
                )}
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Sezione messaggi a destra */}
      <div
        className={`flex flex-col bg-[#efeae2] flex-grow 
              ${selectedChat ? '' : 'hidden md:flex md:w-2/3'}`}
      >
        {selectedChat ? (
          <>
            <div className="bg-[#f0f2f5] p-2 flex items-center">
              {/* Bottone Indietro per mobile */}
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
                    alt={selectedChatData.name || 'Sconosciuto'}
                  />
                ) : (
                  <AvatarFallback className="bg-[#dfe5e7] text-[#54656f]">
                    {getInitials(selectedChatData?.name || 'S')}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-grow">
                <div className="font-semibold text-[#111b21]">
                  {selectedChatData?.name || 'Sconosciuto'}
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
              <Button variant="ghost" size="icon" className="text-[#54656f] ml-2">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
            <div className="h-px bg-[#e9edef]" />
            <ScrollArea ref={messagesRef} className="flex-grow p-4">
              {groupedMessages.map((group, index) => (
                <div key={index}>
                  {/* Separatore di Data */}
                  <div className="flex justify-center mb-4">
                    <div className="bg-[#d1d7db] text-[#111b21] text-sm py-1 px-3 rounded-full">
                      {group.dateLabel}
                    </div>
                  </div>
                  {/* Messaggi */}
                  {group.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`mb-2 ${
                        message.sender === 'Me' ? 'flex justify-end' : 'flex justify-start'
                      }`}
                    >
                      {!isSystemMessage(message) ? (
                        <div
                          className={`max-w-xs sm:max-w-md md:max-w-lg p-2 rounded-lg ${
                            message.sender === 'Me'
                              ? 'bg-[#dcf8c6] text-right'
                              : 'bg-white text-left'
                          }`}
                        >
                          {/* Rendering dei Contenuti Multimediali */}
                          {message.media_url && message.mime_type.startsWith('image/') && (
                            <img
                              src={message.media_url}
                              alt="Immagine"
                              className="mb-2 max-w-full h-auto rounded"
                            />
                          )}
                          {message.media_url && message.mime_type.startsWith('video/') && (
                            <video
                              src={message.media_url}
                              controls
                              className="mb-2 max-w-full h-auto rounded"
                            />
                          )}
                          {message.media_url && message.mime_type === 'application/pdf' && (
                            <a
                              href={message.media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mb-2 text-blue-500 underline"
                            >
                              Visualizza PDF
                            </a>
                          )}
                          {/* Rendering del Testo Formattato */}
                          <ReactMarkdown
                            children={replacePlaceholders(unescapeMessageContent(message.content), Object.values(userData))}
                            remarkPlugins={[remarkGfm]}
                            className="prose prose-sm sm:prose-base break-words"
                          />
                          {/* Indicatore di Stato */}
                          <div className="flex items-center justify-end text-xs text-[#667781] mt-1">
                            {message.sender === 'Me' && message.status !== null && (
                              <span className="mr-1">
                                {message.status >= 3 ? (
                                  <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                                ) : message.status === 4 ? (
                                  <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                                ) : (
                                  <Check className="w-4 h-4 text-[#667781]" />
                                )}
                              </span>
                            )}
                            {format(new Date(message.time), 'HH:mm')}
                          </div>
                        </div>
                      ) : (
                        // Messaggio di sistema
                        <div className="bg-gray-300 text-center py-1 px-3 rounded-full text-sm">
                          <ReactMarkdown
                            children={replacePlaceholders(unescapeMessageContent(message.content), Object.values(userData))}
                            remarkPlugins={[remarkGfm]}
                            className="prose prose-sm sm:prose-base"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {/* Elemento di ancoraggio per scrollare all'ultimo messaggio */}
              <div ref={bottomRef} />
            </ScrollArea>
            {/* Pulsante per tornare all'ultimo messaggio */}
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="fixed bottom-20 right-6 bg-[#25d366] text-white p-3 rounded-full shadow-lg hover:bg-[#1da851] transition"
                aria-label="Torna all'ultimo messaggio"
              >
                <ArrowDown className="w-6 h-6" />
              </button>
            )}
          </>
        ) : (
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

// Funzione per determinare se un messaggio è di sistema
const isSystemMessage = (message) => {
  return message.isSystem;
};

// Funzione per gestire le sequenze di escape nei contenuti dei messaggi
const unescapeMessageContent = (content) => {
  if (!content) return '';
  return content
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\'); // Gestisce le backslash
};

// Funzione per sostituire i placeholder (es. {{1}}, {{2}}, ecc.)
const replacePlaceholders = (content, replacements) => {
  if (!replacements) return content;
  let updatedContent = content;
  replacements.forEach((value, index) => {
    const placeholder = `{{${index + 1}}}`;
    updatedContent = updatedContent.replace(new RegExp(placeholder, 'g'), value);
  });
  return updatedContent;
};
