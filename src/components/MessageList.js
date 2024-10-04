import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MessageList({ messages, selectedChat, messagesRef, bottomRef }) {
  const groupMessagesByDate = (messages) => {
    const groupedMessages = [];
    messages.forEach((message) => {
      const messageDate = new Date(message.time);
      const dateLabel = format(messageDate, "dd/MM/yyyy");

      const dateGroup = groupedMessages.find((group) => group.dateLabel === dateLabel);
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

  const groupedMessages = groupMessagesByDate(messages);

  const isSystemMessage = (message) => message.isSystem;

  const unescapeMessageContent = (content) => {
    if (!content) return "";
    return content
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
  };

  const replacePlaceholders = (content, replacements) => {
    if (!replacements) return content;
    let updatedContent = content;
    replacements.forEach((value, index) => {
      const placeholder = `{{${index + 1}}}`;
      updatedContent = updatedContent.replace(new RegExp(placeholder, "g"), value);
    });
    return updatedContent;
  };

  return (
    <ScrollArea ref={messagesRef} className="flex-grow p-4">
      {groupedMessages.map((group, index) => (
        <div key={index}>
          <div className="flex justify-center mb-4">
            <div className="bg-[#d1d7db] text-[#111b21] text-sm py-1 px-3 rounded-full">
              {group.dateLabel}
            </div>
          </div>
          {group.messages.map((message) => (
            <div key={message.id} className={`mb-2 ${message.sender === "Me" ? "flex justify-end" : "flex justify-start"}`}>
              {!isSystemMessage(message) ? (
                <div className={`inline-block max-w-[80%] p-2 rounded-lg ${message.sender === "Me" ? "bg-[#dcf8c6]" : "bg-white"}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose text-sm break-words">
                    {replacePlaceholders(unescapeMessageContent(message.content), Object.values(message))}
                  </ReactMarkdown>
                  <div className="flex items-center justify-end text-xs text-[#667781] mt-1">
                    {format(new Date(message.time), "HH:mm")}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-300 text-center py-1 px-3 rounded-full text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose text-sm break-words">
                    {replacePlaceholders(unescapeMessageContent(message.content), Object.values(message))}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      <div ref={bottomRef} />
    </ScrollArea>
  );
}
