// components/ChatList.js

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Search } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { Button } from "@/components/ui/button";

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  if (isToday(date)) {
    return format(date, "HH:mm");
  } else if (isYesterday(date)) {
    return "Ieri";
  } else {
    return format(date, "dd/MM/yyyy");
  }
};

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

export default function ChatList(props) {
  const {
    chats,
    contactSearch,
    setContactSearch,
    selectedChat,
    setSelectedChat,
    setChats,
    chatListRef,
    selectedClient,
    setSelectedClient,
    router,
    codiceSpotty,
    altriClientiGruppo,
  } = props;

  const filteredChats = Array.isArray(chats)
    ? chats
        .filter((chat) =>
          (chat.name || "").toLowerCase().includes(contactSearch.toLowerCase())
        )
        .map((chat) => {
          const displayTime = formatTime(chat.lastMessageTime);
          return { ...chat, displayTime };
        })
    : [];

  return (
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
                router.push(`/?codicespotty=${value}`);
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
            onClick={() => setSelectedChat(chat.id)}
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
            </div>
            <div className="flex flex-col items-end ml-2 flex-shrink-0">
              <div className="text-xs text-[#667781]">
                {chat.displayTime}
              </div>
              {chat.hasNewMessage && (
                <div className="bg-green-500 rounded-full w-3 h-3 mt-1"></div>
              )}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}