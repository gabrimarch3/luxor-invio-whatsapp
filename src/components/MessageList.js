// components/MessageList.js

import { format, isToday, isYesterday } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, CheckCheck } from "lucide-react";

export default function MessageList(props) {
  const {
    messages,
    messageSearch,
    selectedChatData,
  } = props;

  const filteredMessages = Array.isArray(messages)
    ? messages.filter((message) =>
        message.content.toLowerCase().includes(messageSearch.toLowerCase())
      )
    : [];

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
      .replace(/\\\\/g, "\\");
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

  const isSystemMessage = (message) => {
    return message.isSystem;
  };

  return (
    <div className="p-4">
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
                message.sender === "Me"
                  ? "flex justify-end"
                  : "flex justify-start"
              }`}
            >
              {!isSystemMessage(message) ? (
                <div
                  className={`inline-block max-w-[80%] p-2 rounded-lg ${
                    message.sender === "Me" ? "bg-[#dcf8c6]" : "bg-white"
                  }`}
                >
                  {/* Rendering media content */}
                  {message.media_url && message.mime_type && (
                    <div className="mb-2">
                      {message.mime_type.startsWith("image/") && (
                        <>
                          <img
                            src={message.media_url}
                            alt="Immagine"
                            className="mb-2 rounded max-w-full max-h-80 object-contain"
                          />
                          {message.content && (
                            <p className="text-sm">{message.content}</p>
                          )}
                        </>
                      )}
                      {/* ... (gestione di altri tipi di media) */}
                    </div>
                  )}

                  {/* Rendering formatted text */}
                  {message.content && (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="prose text-sm break-words"
                    >
                      {replacePlaceholders(
                        unescapeMessageContent(message.content),
                        Object.values(userData)
                      )}
                    </ReactMarkdown>
                  )}

                  {/* Indicatore di stato */}
                  <div className="flex items-center justify-end text-xs text-[#667781] mt-1">
                    {message.sender === "Me" && message.status !== null && (
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
    </div>
  );
}
