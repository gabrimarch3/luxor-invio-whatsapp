import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function ChatList({
  chats,
  selectedChat,
  setSelectedChat,
  setChats,
  chatListRef,
  codiceSpotty,
}) {
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

  const filteredChats = chats.map((chat) => {
    return {
      ...chat,
      displayTime: chat.time ? new Date(chat.time).toLocaleTimeString() : "",
    };
  });

  return (
    <div className="flex flex-col border-r border-[#d1d7db] bg-white w-full md:w-1/3">
      <div className="bg-[#f0f2f5] p-4">
        <div className="relative">
          <Input placeholder="Cerca o inizia una nuova chat" className="pl-10 bg-white" />
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
              setChats((prevChats) =>
                prevChats.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
              );
            }}
          >
            <Avatar className="h-12 w-12 mr-3 flex-shrink-0">
              {chat.avatar ? (
                <AvatarImage src={chat.avatar} alt={chat.name || "Sconosciuto"} />
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
                {chat.lastMessageSender === "Me" ? "tu: " : ""}
                {truncateMessage(chat.lastMessage || "", 30)}
              </div>
            </div>
            <div className="flex flex-col items-end ml-2 flex-shrink-0">
              <div className="text-xs text-[#667781]">{chat.displayTime}</div>
              {chat.unreadCount > 0 && (
                <div className="bg-red-500 text-white rounded-full min-w-[20px] h-5 flex items-center justify-center text-xs mt-1 px-1">
                  {chat.unreadCount}
                </div>
              )}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
