'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  MessageCircle,
  Search,
  MoreVertical,
  ChevronLeft,
  Check,
  CheckCheck,
  ArrowDown,
  Send,
} from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from '@/components/ui/dialog';
import { format, isToday, isYesterday } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import debounce from 'lodash.debounce';

export default function ChatComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const codicespottyParam = searchParams.get('codicespotty');

  const [selectedClient, setSelectedClient] = useState(codicespottyParam || null);
  const codiceSpotty = selectedClient ? `spotty${selectedClient}` : null;

  const [chats, setChats] = useState([]);
  const [altriClientiGruppo, setAltriClientiGruppo] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isChatDisabled, setIsChatDisabled] = useState(false);

  const chatListRef = useRef(null);
  const messagesRef = useRef(null);
  const bottomRef = useRef(null);

  const initialAltriClientiGruppo = useRef(null);

  useEffect(() => {
    if (codiceSpotty) {
      console.log('codice_spotty:', codiceSpotty);
      fetchChats();
    } else {
      console.log("codice_spotty non trovato");
    }
  }, [codiceSpotty]);

  useEffect(() => {
    if (selectedChat && codiceSpotty) {
      console.log(
        'Fetching messages for chat:',
        selectedChat,
        'with codice_spotty:',
        codiceSpotty
      );
      fetchMessages(selectedChat);
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === selectedChat ? { ...chat, unreadCount: 0 } : chat
        )
      );
    }
  }, [selectedChat, codiceSpotty]);

  // Controlla se la chat deve essere disabilitata
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const lastMessageTime = new Date(lastMessage.time);
      const now = new Date();
      const timeDifference = now - lastMessageTime;
      const hoursDifference = timeDifference / (1000 * 60 * 60);
      if (hoursDifference > 24) {
        setIsChatDisabled(true);
      } else {
        setIsChatDisabled(false);
      }
    } else {
      setIsChatDisabled(false);
    }
  }, [messages]);

  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const scrollContainer = messagesRef.current;

    if (!scrollContainer) return;

    const handleScroll = debounce(() => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;

      setShowScrollButton(!isAtBottom);
    }, 200);

    scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      handleScroll.cancel();
    };
  }, [messages]);

  const fetchChats = async () => {
    try {
      const response = await fetch(
        `https://welcome.spottywifi.app/concierge/chatbot/api/chats.php?codice_spotty=${encodeURIComponent(
          codiceSpotty
        )}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Errore HTTP! status: ${response.status} - ${errorData.message}`
        );
      }
      const data = await response.json();
      console.log("Dati ricevuti dall'API chats.php:", data);
      setChats(data.chats);

      if (initialAltriClientiGruppo.current === null) {
        setAltriClientiGruppo(data.altriClientiGruppo || []);
        initialAltriClientiGruppo.current = data.altriClientiGruppo || [];
      }
    } catch (error) {
      console.error('Errore nel recupero delle chat:', error);
      setChats([]);
    }
  };

  const fetchMessages = async (mobile) => {
    try {
      const response = await fetch(
        `https://welcome.spottywifi.app/concierge/chatbot/api/messages.php?codice_spotty=${encodeURIComponent(
          codiceSpotty
        )}&mobile=${encodeURIComponent(mobile)}`
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
      setMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (messageInput.trim() === '') return;
    const newMessage = {
      id: Date.now(),
      sender: 'Me',
      content: messageInput,
      time: new Date().toISOString(),
      status: null,
      isSystem: false,
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);

    try {
      const response = await fetch(
        'https://welcome.spottywifi.app/concierge/chatbot/api/send-message.php',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            codice_spotty: codiceSpotty,
            mobile: selectedChat,
            message: messageInput,
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Errore nell'invio del messaggio");
      }
    } catch (error) {
      console.error("Errore nell'invio del messaggio:", error);
    }

    setMessageInput('');
    scrollToBottom();
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

  const selectedChatData = Array.isArray(chats)
    ? chats.find((chat) => chat.id === selectedChat)
    : null;

  const handleBack = () => {
    setSelectedChat(null);
  };

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

  const groupedMessages = groupMessagesByDate(filteredMessages);

  const unescapeMessageContent = (content) => {
    if (!content) return '';
    return content
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\'); // Gestisce le backslash
  };

  const isSystemMessage = (message) => {
    return message.isSystem;
  };

  const replacePlaceholders = (content, replacements) => {
    if (!replacements) return content;
    let updatedContent = content;
    replacements.forEach((value, index) => {
      const placeholder = `{{${index + 1}}}`;
      updatedContent = updatedContent.replace(new RegExp(placeholder, 'g'), value);
    });
    return updatedContent;
  };

  const userData = {
    1: 'Mirco',
    2: 'Ceccarini',
    3: 'Qualche altro dato',
    4: 'Un altro dato',
  };

  const scrollToBottom = () => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }

    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!codiceSpotty) {
    const [spottyNumber, setSpottyNumber] = useState('');

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
            <input
              type="text"
              className="border border-gray-300 rounded-l px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Inserisci il numero"
              value={spottyNumber}
              onChange={(e) => setSpottyNumber(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700 transition duration-200"
            >
              Vai
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f0f2f5]">
      {/* Sezione sinistra delle chat */}
      <div
        className={`flex flex-col border-r border-[#d1d7db] bg-white 
              ${selectedChat ? 'hidden md:flex md:w-1/3' : 'w-full md:w-1/3'}`}
      >
        <div className="bg-[#f0f2f5] p-4">
          {/* Componente Select per altri clienti del gruppo */}
          {altriClientiGruppo.length > 0 && (
            <div className="mb-4">
              <Select
                value={selectedClient}
                onValueChange={(value) => {
                  setSelectedClient(value);
                  router.push(`?codicespotty=${value}`);
                }}
              >
                <SelectTrigger className="w-full">
                  {selectedClient ? (
                    <SelectValue />
                  ) : (
                    <span className="text-gray-500">Seleziona una struttura</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {altriClientiGruppo.map((cliente) => {
                    const numero = cliente.CodiceCliente.replace('spotty', '');
                    return (
                      <SelectItem key={numero} value={numero}>
                        {cliente.NomeCliente}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="relative">
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
              onClick={() => {
                setSelectedChat(chat.id);
              }}
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

      {/* Sezione destra dei messaggi */}
      <div
        className={`flex flex-col bg-[#efeae2] flex-grow h-full
              ${selectedChat ? '' : 'hidden md:flex md:w-2/3'}`}
      >
        {selectedChat ? (
          <div className="flex flex-col h-full">
            {/* Barra dei contatti */}
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
            </div>
            {/* Area dei messaggi scrollabile */}
            <div className="flex-grow overflow-y-auto">
              <ScrollArea ref={messagesRef} className="p-4">
                {groupedMessages.map((group, index) => (
                  <div key={index}>
                    {/* Separatore di data */}
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
                          message.sender === 'Me'
                            ? 'flex justify-end'
                            : 'flex justify-start'
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
                            {/* Rendering del contenuto multimediale */}
                            {message.media_url &&
                              message.mime_type &&
                              message.mime_type.startsWith('image/') && (
                                <img
                                  src={message.media_url}
                                  alt="Immagine"
                                  className="mb-2 max-w-full h-auto rounded"
                                />
                              )}
                            {message.media_url &&
                              message.mime_type &&
                              message.mime_type.startsWith('video/') && (
                                <video
                                  src={message.media_url}
                                  controls
                                  className="mb-2 max-w-full h-auto rounded"
                                />
                              )}
                            {message.media_url &&
                              message.mime_type === 'application/pdf' && (
                                <a
                                  href={message.media_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mb-2 text-blue-500 underline"
                                >
                                  Visualizza PDF
                                </a>
                              )}
                            {/* Rendering del testo formattato */}
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              className="prose text-sm break-words"
                            >
                              {replacePlaceholders(
                                unescapeMessageContent(message.content),
                                Object.values(userData)
                              )}
                            </ReactMarkdown>
                            {/* Indicatore di stato */}
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
                              remarkPlugins={[remarkGfm]}
                              className="prose text-sm break-words"
                            >
                              {replacePlaceholders(
                                unescapeMessageContent(message.content),
                                Object.values(userData)
                              )}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                {/* Elemento per scrollare all'ultimo messaggio */}
                <div ref={bottomRef} />
              </ScrollArea>
            </div>
            {/* Barra di input */}
            <div className="flex items-center p-3 bg-[#f0f2f5]">
              {/* Pulsante Template */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="text-[#54656f]">
                    Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Seleziona un template</DialogTitle>
                    <DialogDescription>Contenuto del modale</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button onClick={() => {}}>Chiudi</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Campo di testo o area disabilitata */}
              <div className="flex-grow mx-2">
                {isChatDisabled ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="w-full bg-gray-200 text-gray-500 px-4 py-2 rounded cursor-pointer">
                        La chat è disabilitata. Clicca qui per selezionare un template.
                      </div>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        
                    <DialogTitle>Seleziona un template</DialogTitle>
                    <DialogDescription>Una volta terminate le 24 ore dall'ultimo messaggio occorre selezionare uno dei tuoi template da qui sotto</DialogDescription>
                      </DialogHeader>
                      
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Input
                    className="w-full"
                    placeholder="Scrivi un messaggio"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage();
                      }
                    }}
                  />
                )}
              </div>

              {/* Pulsante di invio */}
              {isChatDisabled ? (
                <Button variant="ghost" className="text-[#54656f]" disabled>
                  <Send className="w-6 h-6" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="text-[#54656f]"
                  onClick={handleSendMessage}
                >
                  <Send className="w-6 h-6" />
                </Button>
              )}
            </div>

            {/* Pulsante per scrollare in fondo */}
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


