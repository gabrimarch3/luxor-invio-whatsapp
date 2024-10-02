"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Search,
  MoreVertical,
  ChevronLeft,
  Check,
  CheckCheck,
  ArrowDown,
  Send,
  ChevronRight,
  Image as ImageIcon,
  FileText,
  X,
  Video as VideoIcon,
} from "lucide-react";
import { format, isToday, isYesterday, differenceInHours } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import debounce from "lodash.debounce";

export default function ChatComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const codicespottyParam = searchParams.get("codicespotty");

  const [selectedClient, setSelectedClient] = useState(
    codicespottyParam || null
  );
  const codiceSpotty = selectedClient ? `spotty${selectedClient}` : null;

  const [chats, setChats] = useState([]);
  const [altriClientiGruppo, setAltriClientiGruppo] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [contactSearch, setContactSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isChatDisabled, setIsChatDisabled] = useState(false);

  const chatListRef = useRef(null);
  const messagesRef = useRef(null);
  const bottomRef = useRef(null);

  const initialAltriClientiGruppo = useRef(null);

  // States for template management
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templatesByLanguage, setTemplatesByLanguage] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState("it");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [errorTemplates, setErrorTemplates] = useState(null);

  // Additional states for TemplateGallery
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    if (codiceSpotty) {
      fetchChats();
    }
  }, [codiceSpotty]);

  useEffect(() => {
    if (selectedChat && codiceSpotty) {
      fetchMessages(selectedChat);
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === selectedChat ? { ...chat, unreadCount: 0 } : chat
        )
      );
    }
  }, [selectedChat, codiceSpotty]);

  // Check if the chat should be disabled
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const lastMessageTime = new Date(lastMessage.time);
      const now = new Date();
      const hoursDifference = differenceInHours(now, lastMessageTime);
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

    scrollContainer.addEventListener("scroll", handleScroll);

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
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

      // Fetch the last message for each chat
      const chatsWithLastMessage = await Promise.all(
        data.chats.map(async (chat) => {
          try {
            const messagesResponse = await fetch(
              `https://welcome.spottywifi.app/concierge/chatbot/api/messages.php?codice_spotty=${encodeURIComponent(
                codiceSpotty
              )}&mobile=${encodeURIComponent(chat.id)}&limit=1`
            );
            if (!messagesResponse.ok) {
              throw new Error("Errore nel recupero dell'ultimo messaggio");
            }
            const messagesData = await messagesResponse.json();
            let lastMessageContent = "";
            let lastMessageType = "";
            let lastMessageSender = "";
            let lastMessageTime = "";
            if (messagesData.length > 0) {
              const lastMessage = messagesData[messagesData.length - 1];
              lastMessageSender = lastMessage.sender;
              lastMessageTime = lastMessage.time;
              if (lastMessage.media_url) {
                if (lastMessage.mime_type.startsWith("image/")) {
                  lastMessageContent = "📷 immagine";
                  lastMessageType = "image";
                } else if (lastMessage.mime_type.startsWith("video/")) {
                  lastMessageContent = "🎥 video";
                  lastMessageType = "video";
                } else if (lastMessage.mime_type === "application/pdf") {
                  lastMessageContent = "📄 documento";
                  lastMessageType = "document";
                } else {
                  lastMessageContent = "media";
                  lastMessageType = "media";
                }
              } else {
                lastMessageContent = lastMessage.content;
                lastMessageType = "text";
              }
            }
            return {
              ...chat,
              lastMessage: lastMessageContent,
              lastMessageSender,
              lastMessageType,
              time: lastMessageTime || "",
            };
          } catch (error) {
            return {
              ...chat,
              lastMessage: "",
              lastMessageSender: "",
              lastMessageType: "",
              time: "",
            };
          }
        })
      );
      setChats(chatsWithLastMessage);

      if (initialAltriClientiGruppo.current === null) {
        setAltriClientiGruppo(data.altriClientiGruppo || []);
        initialAltriClientiGruppo.current = data.altriClientiGruppo || [];
      }
    } catch (error) {
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
      setMessages([]);
    }
  };

  // Update the function signature to accept mediaUrl and mimeType
  const handleSendMessage = async (
    messageContent,
    mediaUrl = null,
    mimeType = null
  ) => {
    const content = messageContent || messageInput;
    // Prevent sending if there's no content and no media
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

    // Update chats
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === selectedChat
          ? {
              ...chat,
              lastMessage: newMessage.content || (mediaUrl ? "Media" : ""),
              lastMessageSender: "Me",
              lastMessageType: mimeType ? mimeType.split("/")[0] : "text",
              time: newMessage.time,
            }
          : chat
      )
    );

    try {
      // Prepare the data to send
      const payload = {
        codice_spotty: codiceSpotty,
        mobile: selectedChat,
        message: content,
      };

      // Include media information if available
      if (mediaUrl && mimeType) {
        payload.media_url = mediaUrl;
        payload.mime_type = mimeType;
      }

      const response = await fetch(
        "https://welcome.spottywifi.app/concierge/chatbot/api/send-message.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        throw new Error("Errore nell'invio del messaggio");
      }
    } catch (error) {
      console.error("Errore nell'invio del messaggio:", error);
    }

    setMessageInput("");
    setIsChatDisabled(false); // Enable the chat
    scrollToBottom();
  };

  // Function to load templates from the server
  const fetchTemplates = async () => {
    if (!codiceSpotty) return;

    setLoadingTemplates(true);
    setErrorTemplates(null);

    try {
      const response = await fetch(
        `https://welcome.spottywifi.app/concierge/chatbot/api/templates.php?codice_spotty=${encodeURIComponent(
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

      if (data.templates) {
        setTemplatesByLanguage(data.templates);
      } else {
        throw new Error("Struttura dei template non valida");
      }
    } catch (error) {
      console.error("Errore nel recupero dei template:", error);
      setErrorTemplates("Errore nel recupero dei template.");
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Fetch templates when the modal is opened
  useEffect(() => {
    if (isTemplateDialogOpen) {
      fetchTemplates();
    }
  }, [isTemplateDialogOpen]);

  const handleTemplateSelect = (template) => {
    const selectedTemplateText = template?.CorpoMessaggio || "";

    // Build the media URL if there is an image or video
    let mediaUrl = null;
    let mimeType = null;

    if (template.Immagine) {
      const mediaFileName = template.Immagine;
      mediaUrl = `https://media.spottywifi.app/wa/${codiceSpotty.replace(
        "spotty",
        ""
      )}/images/${mediaFileName}`;

      if (/\.(mp4|mov|avi|mkv)$/i.test(mediaFileName)) {
        mimeType = "video/" + mediaFileName.split(".").pop();
      } else if (/\.(jpg|jpeg|png|gif)$/i.test(mediaFileName)) {
        mimeType = "image/" + mediaFileName.split(".").pop();
      } else if (mediaFileName.endsWith(".pdf")) {
        mimeType = "application/pdf";
      }
    }

    // Send the template message with media if available
    handleSendMessage(selectedTemplateText, mediaUrl, mimeType);
    setIsTemplateDialogOpen(false);
    setSelectedTemplate(null);
    scrollToBottom(); // Scroll to bottom after sending the message
  };

  // Functions and states for TemplateGallery
  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    setCurrentPage(1);
    setSelectedTemplate(null);
  };

  const changePage = (pageNumber) => {
    setCurrentPage(pageNumber);
    setSelectedTemplate(null);
  };

  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
  };

  const closePreview = () => {
    setSelectedTemplate(null);
  };

  const filteredChats = Array.isArray(chats)
    ? chats
        .filter((chat) =>
          (chat.name || "").toLowerCase().includes(contactSearch.toLowerCase())
        )
        .map((chat) => {
          const messageTime = new Date(chat.time);
          if (isNaN(messageTime)) {
            return { ...chat, displayTime: "" };
          }
          const now = new Date();
          const hoursDifference = differenceInHours(now, messageTime);
          const displayTime =
            hoursDifference <= 24
              ? format(messageTime, "HH:mm")
              : format(messageTime, "dd/MM/yyyy");
          return { ...chat, displayTime };
        })
    : [];

  const filteredMessages = Array.isArray(messages)
    ? messages.filter((message) =>
        message.content.toLowerCase().includes(messageSearch.toLowerCase())
      )
    : [];

  const getInitials = (name) => {
    const validName = name || "S";
    return validName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const truncateMessage = (message, maxLength) => {
    return message.length > maxLength
      ? message.substring(0, maxLength) + "..."
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
      let dateLabel = "";
      if (isToday(messageDate)) {
        dateLabel = "Oggi";
      } else if (isYesterday(messageDate)) {
        dateLabel = "Ieri";
      } else {
        dateLabel = format(messageDate, "dd/MM/yyyy");
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
    if (!content) return "";
    return content
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\"); // Handles backslashes
  };

  const isSystemMessage = (message) => {
    return message.isSystem;
  };

  const replacePlaceholders = (content, replacements) => {
    if (!replacements) return content;
    let updatedContent = content;
    replacements.forEach((value, index) => {
      const placeholder = `{{${index + 1}}}`;
      updatedContent = updatedContent.replace(
        new RegExp(placeholder, "g"),
        value
      );
    });
    return updatedContent;
  };

  const userData = {
    1: "Mirco",
    2: "Ceccarini",
    3: "Qualche altro dato",
    4: "Un altro dato",
  };

  const scrollToBottom = () => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: "smooth",
      });
    }

    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Variables for TemplateGallery
  const validTemplatesByLanguage =
    templatesByLanguage && typeof templatesByLanguage === "object"
      ? templatesByLanguage
      : {};

  const templates = validTemplatesByLanguage[selectedLanguage] || [];

  const TEMPLATES_PER_PAGE = 6;
  const totalPages = Math.ceil(templates.length / TEMPLATES_PER_PAGE);
  const currentTemplates = templates.slice(
    (currentPage - 1) * TEMPLATES_PER_PAGE,
    currentPage * TEMPLATES_PER_PAGE
  );

  if (!codiceSpotty) {
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
      {/* Left section of chats */}
      <div
        className={`flex flex-col border-r border-[#d1d7db] bg-white 
              ${selectedChat ? "hidden md:flex md:w-1/3" : "w-full md:w-1/3"}`}
      >
        <div className="bg-[#f0f2f5] p-4">
          {/* Select component for other group clients */}
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
                    <SelectValue placeholder="Seleziona un'altra struttura" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {altriClientiGruppo.map((cliente) => {
                    const numero = cliente.CodiceCliente.replace("spotty", "");
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
                selectedChat === chat.id ? "bg-[#f0f2f5]" : ""
              }`}
              onClick={() => {
                setSelectedChat(chat.id);
              }}
            >
              <Avatar className="h-12 w-12 mr-3 flex-shrink-0">
                {chat.avatar ? (
                  <AvatarImage
                    src={chat.avatar}
                    alt={chat.name || "Sconosciuto"}
                  />
                ) : (
                  <AvatarFallback className="bg-[#dfe5e7] text-[#54656f]">
                    {getInitials(chat.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-grow min-w-0">
                <div className="font-semibold text-[#111b21] truncate">
                  {chat.name || "Sconosciuto"}
                </div>
                <div className="text-sm text-[#667781] truncate">
                  {chat.lastMessageType === "image" ||
                  chat.lastMessageType === "media"
                    ? "📷 immagine"
                    : chat.lastMessageType === "video"
                    ? "🎥 video"
                    : chat.lastMessageType === "document"
                    ? "📄 documento"
                    : `${
                        chat.lastMessageSender === "Me" ? "tu: " : ""
                      }${truncateMessage(chat.lastMessage || "", 30)}`}
                </div>
              </div>
              <div className="flex flex-col items-end ml-2 flex-shrink-0">
                <div className="text-xs text-[#667781]">
                  {chat.displayTime || ""}
                </div>
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

      {/* Right section of messages */}
      <div
        className={`flex flex-col bg-[#efeae2] flex-grow h-full
              ${selectedChat ? "" : "hidden md:flex md:w-2/3"}`}
      >
        {selectedChat ? (
          <div className="flex flex-col h-full">
            {/* Contact bar */}
            <div className="flex-shrink-0 sticky top-0 z-10">
              <div className="bg-[#f0f2f5] p-2 flex items-center">
                {/* Back button for mobile */}
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
            {/* Scrollable message area */}
            <div className="flex-grow overflow-y-auto">
              <ScrollArea ref={messagesRef} className="p-4">
                {groupedMessages.map((group, index) => (
                  <div key={index}>
                    {/* Date separator */}
                    <div className="flex justify-center mb-4">
                      <div className="bg-[#d1d7db] text-[#111b21] text-sm py-1 px-3 rounded-full">
                        {group.dateLabel}
                      </div>
                    </div>
                    {/* Messages */}
                    {group.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`mb-2 ${
                          message.sender === "Me"
                            ? "flex justify-end"
                            : "flex justify-start"
                        }`}
                      >
                        {!isSystemMessage(message) ? (
                          <div
                            className={`max-w-full sm:max-w-md md:max-w-lg p-2 rounded-lg ${
                              message.sender === "Me"
                                ? "bg-[#dcf8c6] text-right"
                                : "bg-white text-left"
                            }`}
                          >
                            {/* Rendering media content */}
                            {message.media_url && message.mime_type && (
                              <>
                                {message.mime_type.startsWith("image/") && (
                                  <img
                                    src={message.media_url}
                                    alt="Immagine"
                                    className="mb-2 max-w-full h-auto rounded max-h-64"
                                  />
                                )}
                                {message.mime_type.startsWith("video/") && (
                                  <video
                                    src={message.media_url}
                                    controls
                                    className="mb-2 max-w-full h-auto rounded max-h-64"
                                  />
                                )}
                                {message.mime_type === "application/pdf" && (
                                  <a
                                    href={message.media_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mb-2 text-blue-500 underline"
                                  >
                                    Visualizza PDF
                                  </a>
                                )}
                              </>
                            )}

                            {/* Rendering formatted text */}
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              className="prose text-sm break-words"
                            >
                              {replacePlaceholders(
                                unescapeMessageContent(message.content),
                                Object.values(userData)
                              )}
                            </ReactMarkdown>
                            {/* Status indicator */}
                            <div className="flex items-center justify-end text-xs text-[#667781] mt-1">
                              {message.sender === "Me" &&
                                message.status !== null && (
                                  <span className="mr-1">
                                    {message.status >= 2 ? (
                                      <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                                    ) : message.status === 4 ? (
                                      <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                                    ) : (
                                      <Check className="w-4 h-4 text-[#667781]" />
                                    )}
                                  </span>
                                )}
                              {format(new Date(message.time), "HH:mm")}
                            </div>
                          </div>
                        ) : (
                          // System message
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
                {/* Element to scroll to the last message */}
                <div ref={bottomRef} />
              </ScrollArea>
            </div>
            {/* Input bar */}
            <div className="flex items-center p-3 bg-[#f0f2f5]">
              {/* Template Button */}
              <Dialog
                open={isTemplateDialogOpen}
                onOpenChange={(open) => {
                  setIsTemplateDialogOpen(open);
                  setSelectedTemplate(null);
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" className="text-[#54656f]">
                    Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="p-0 max-h-screen overflow-y-auto">
                  <div className="space-y-4 p-4 bg-background">
                    <DialogHeader>
                      <DialogTitle>Seleziona un template</DialogTitle>
                      <DialogDescription>
                        Scegli uno dei template disponibili per inviare un
                        messaggio predefinito.
                      </DialogDescription>
                    </DialogHeader>
                    {/* Language Selector */}
                    <div className="max-w-xs mx-auto">
                      <Select
                        value={selectedLanguage}
                        onValueChange={handleLanguageChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleziona una lingua" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(validTemplatesByLanguage).length > 0 ? (
                            Object.keys(validTemplatesByLanguage).map(
                              (lang) => (
                                <SelectItem key={lang} value={lang}>
                                  {lang.toUpperCase()}
                                </SelectItem>
                              )
                            )
                          ) : (
                            <SelectItem value="it">IT</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Template List or Preview */}
                    {selectedTemplate ? (
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={closePreview}
                          className="absolute top-2 right-2 z-10"
                        >
                          <X className="h-6 w-6" />
                        </Button>
                        {/* WhatsApp Message Bubble */}
                        <div className="flex justify-end mt-8">
                          <div
                            className="max-w-full sm:max-w-md md:max-w-lg p-2 rounded-lg bg-[#dcf8c6] text-right"
                            style={{ overflowWrap: "break-word" }}
                          >
                            {/* Only display media in preview */}
                            {selectedTemplate.Immagine && (
                              <div className="mb-2">
                                {selectedTemplate.Immagine.endsWith(".pdf") ? (
                                  <div className="flex items-center justify-center">
                                    <FileText className="w-12 h-12 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                      PDF
                                    </p>
                                  </div>
                                ) : /\.(mp4|mov|avi|mkv)$/i.test(
                                    selectedTemplate.Immagine
                                  ) ? (
                                  <video
                                    src={`https://media.spottywifi.app/wa/${codiceSpotty.replace(
                                      "spotty",
                                      ""
                                    )}/images/${selectedTemplate.Immagine}`}
                                    controls
                                    className="mb-2 max-w-full h-auto rounded max-h-64"
                                  />
                                ) : (
                                  <img
                                    src={`https://media.spottywifi.app/wa/${codiceSpotty.replace(
                                      "spotty",
                                      ""
                                    )}/images/${selectedTemplate.Immagine}`}
                                    alt={selectedTemplate.Nome}
                                    className="mb-2 max-w-full h-auto rounded max-h-64"
                                  />
                                )}
                              </div>
                            )}

                            {/* Message Content */}
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              className="prose text-sm break-words"
                            >
                              {unescapeMessageContent(
                                selectedTemplate.CorpoMessaggio
                              )}
                            </ReactMarkdown>
                            {/* Time */}
                            <div className="flex items-center justify-end text-xs text-[#667781] mt-1">
                              {format(new Date(), "HH:mm")}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end mt-4">
                          <Button
                            onClick={() => {
                              handleTemplateSelect(selectedTemplate);
                            }}
                            className="mt-4"
                          >
                            Invia Template
                          </Button>
                        </div>
                      </div>
                    ) : templates.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentTemplates.map((template) => {
                          const isImage =
                            template.Immagine &&
                            /\.(jpg|jpeg|png|gif)$/i.test(template.Immagine);
                          const isVideo =
                            template.Immagine &&
                            /\.(mp4|mov|avi|mkv)$/i.test(template.Immagine);
                          const isPDF =
                            template.Immagine &&
                            template.Immagine.endsWith(".pdf");

                          return (
                            <Card
                              key={template.Uuid}
                              className="hover:bg-accent transition-colors cursor-pointer"
                              onClick={() => handleTemplateClick(template)}
                            >
                              <CardHeader className="p-0 overflow-hidden">
                                <div className="w-full h-32 bg-muted rounded-t-lg flex items-center justify-center">
                                  {isImage ? (
                                    <img
                                      src={`https://media.spottywifi.app/wa/${codiceSpotty.replace(
                                        "spotty",
                                        ""
                                      )}/images/${template.Immagine}`}
                                      alt={template.Nome}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : isVideo ? (
                                    <div className="flex flex-col items-center">
                                      <VideoIcon className="w-12 h-12 text-muted-foreground" />
                                      <p className="text-sm text-muted-foreground">
                                        Video
                                      </p>
                                    </div>
                                  ) : isPDF ? (
                                    <div className="flex flex-col items-center">
                                      <FileText className="w-12 h-12 text-muted-foreground" />
                                      <p className="text-sm text-muted-foreground">
                                        PDF
                                      </p>
                                    </div>
                                  ) : (
                                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="p-3">
                                <h3 className="text-sm font-semibold text-foreground truncate">
                                  {template.Nome}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {template.NomeTemplate}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Creato il:{" "}
                                  {new Date(
                                    template.DataCreazione
                                  ).toLocaleDateString()}
                                </p>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground">
                        Nessun template disponibile per la lingua selezionata.
                      </p>
                    )}
                    {/* Pagination */}
                    {totalPages > 1 && !selectedTemplate && (
                      <div className="flex justify-between items-center mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => changePage(currentPage - 1)}
                        >
                          <ChevronLeft className="h-4 w-4 mr-2" />
                          Precedente
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Pagina {currentPage} di {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => changePage(currentPage + 1)}
                        >
                          Successiva
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Input field or disabled area */}
              <div className="flex-grow mx-2">
                {isChatDisabled ? (
                  <Dialog open={isTemplateDialogOpen}>
                    <DialogTrigger asChild>
                      <div
                        onClick={() => setIsTemplateDialogOpen(true)}
                        className="w-full bg-gray-200 text-gray-500 px-4 py-2 rounded cursor-pointer"
                      >
                        La chat è disabilitata. Clicca qui per selezionare un
                        template.
                      </div>
                    </DialogTrigger>
                  </Dialog>
                ) : (
                  <Input
                    className="w-full"
                    placeholder="Scrivi un messaggio"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSendMessage();
                      }
                    }}
                  />
                )}
              </div>

              {/* Send button */}
              {isChatDisabled ? (
                <Button variant="ghost" className="text-[#54656f]" disabled>
                  <Send className="w-6 h-6" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="text-[#54656f]"
                  onClick={() => handleSendMessage()}
                >
                  <Send className="w-6 h-6" />
                </Button>
              )}
            </div>

            {/* Scroll to bottom button */}
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

// Function to determine if a message is a system message
const isSystemMessage = (message) => {
  return message.isSystem;
};

// Function to handle escape sequences in message contents
const unescapeMessageContent = (content) => {
  if (!content) return "";
  return content
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\"); // Handles backslashes
};

// Function to replace placeholders (e.g., {{1}}, {{2}}, etc.)
const replacePlaceholders = (content, replacements) => {
  if (!replacements) return content;
  let updatedContent = content;
  replacements.forEach((value, index) => {
    const placeholder = `{{${index + 1}}}`;
    updatedContent = updatedContent.replace(
      new RegExp(placeholder, "g"),
      value
    );
  });
  return updatedContent;
};
