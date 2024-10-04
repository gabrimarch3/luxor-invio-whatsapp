"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ArrowDown, Send } from "lucide-react";

import ChatList from "./ChatList";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import TemplateDialog from "./TemplateDialog";

export default function ChatComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const codicespottyParam = searchParams.get("codicespotty");

  const [selectedClient, setSelectedClient] = useState(codicespottyParam || null);
  const codiceSpotty = selectedClient ? `spotty${selectedClient}` : null;

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [isChatDisabled, setIsChatDisabled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const chatListRef = useRef(null);
  const messagesRef = useRef(null);
  const bottomRef = useRef(null);

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

  const handleSendMessage = async (messageContent, mediaUrl = null, mimeType = null) => {
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
            }
          : chat
      )
    );

    try {
      const payload = {
        codice_spotty: codiceSpotty,
        mobile: selectedChat,
        message: content,
      };

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
    setIsChatDisabled(false);
    scrollToBottom();
  };

  useLayoutEffect(() => {
    if (messagesRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;

      if (isAtBottom) {
        scrollToBottom();
      }
    }
  }, [messages]);

  return (
    <div className="flex h-screen bg-[#f0f2f5]">
      <ChatList
        chats={chats}
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
        setChats={setChats}
        chatListRef={chatListRef}
        codiceSpotty={codiceSpotty}
      />
      <div className="flex flex-col bg-[#efeae2] flex-grow h-full">
        {selectedChat ? (
          <>
            <MessageList
              messages={messages}
              selectedChat={selectedChat}
              messagesRef={messagesRef}
              bottomRef={bottomRef}
            />
            <ChatInput
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              handleSendMessage={handleSendMessage}
              isChatDisabled={isChatDisabled}
            />
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="fixed bottom-20 right-6 bg-[#25d366] text-white p-3 rounded-full shadow-lg hover:bg-[#1da851] transition"
              >
                <ArrowDown className="w-6 h-6" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-[#f0f2f5]">
            <p className="text-lg text-[#41525d] text-center px-4">
              Seleziona una chat per iniziare la conversazione
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
