// components/MessageList.js

// Importazione delle dipendenze necessarie
import { format, isToday, isYesterday } from "date-fns"; // Funzioni per la formattazione e il confronto delle date
import ReactMarkdown from "react-markdown"; // Componente per il rendering del markdown
import remarkGfm from "remark-gfm"; // Plugin per supportare GitHub Flavored Markdown
import { Check, CheckCheck } from "lucide-react"; // Icone per lo stato dei messaggi

// Componente principale MessageList
export default function MessageList(props) {
  // Destrutturazione delle props
  const {
    messages, // Array di messaggi da visualizzare
    messageSearch, // Stringa di ricerca per filtrare i messaggi
    selectedChatData, // Dati della chat selezionata (non utilizzato in questo componente)
  } = props;

  // Filtraggio dei messaggi in base alla stringa di ricerca
  const filteredMessages = Array.isArray(messages)
    ? messages.filter((message) =>
        message.content.toLowerCase().includes(messageSearch.toLowerCase())
      )
    : [];

  // Funzione per raggruppare i messaggi per data
  const groupMessagesByDate = (messages) => {
    const groupedMessages = [];
    messages.forEach((message) => {
      const messageDate = new Date(message.time);
      let dateLabel = "";
      // Determinazione dell'etichetta della data
      if (isToday(messageDate)) {
        dateLabel = "Oggi";
      } else if (isYesterday(messageDate)) {
        dateLabel = "Ieri";
      } else {
        dateLabel = format(messageDate, "dd/MM/yyyy");
      }

      // Aggiunta del messaggio al gruppo corrispondente
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

  // Applicazione del raggruppamento ai messaggi filtrati
  const groupedMessages = groupMessagesByDate(filteredMessages);

  // Funzione per rimuovere i caratteri di escape dal contenuto del messaggio
  const unescapeMessageContent = (content) => {
    if (!content) return "";
    return content
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
  };

  // Funzione per sostituire i placeholder nel contenuto del messaggio
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

  // Dati utente di esempio per la sostituzione dei placeholder
  const userData = {
    1: "Mirco",
    2: "Ceccarini",
    3: "Qualche altro dato",
    4: "Un altro dato",
  };

  // Funzione per determinare se un messaggio è di sistema
  const isSystemMessage = (message) => {
    return message.isSystem;
  };

  // Rendering del componente
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
          {/* Rendering dei messaggi */}
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
                // Rendering di un messaggio normale
                <div
                  className={`inline-block max-w-[80%] p-2 rounded-lg ${
                    message.sender === "Me" ? "bg-[#dcf8c6]" : "bg-white"
                  }`}
                >
                  {/* Rendering del contenuto multimediale */}
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
                      {/* Qui si possono aggiungere gestioni per altri tipi di media */}
                    </div>
                  )}

                  {/* Rendering del testo formattato */}
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

                  {/* Indicatore di stato del messaggio */}
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
                // Rendering di un messaggio di sistema
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
