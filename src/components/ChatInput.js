// components/ChatInput.js

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X } from "lucide-react";
import TemplateDialog from "./TemplateDialog";
import { useState, useRef } from "react";
import Image from 'next/image';

export default function ChatInput(props) {
  const {
    messageInput,
    setMessageInput,
    isChatDisabled,
    handleSendMessage,
    isTemplateDialogOpen,
    setIsTemplateDialogOpen,
    codiceSpotty,
    selectedChat,
    scrollToBottom,
  } = props;

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const fileReader = new FileReader();
      fileReader.onload = (e) => setPreviewUrl(e.target.result);
      fileReader.readAsDataURL(file);
    }
  };

  const handleSendWithMedia = async () => {
    if (selectedFile) {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('codice_spotty', codiceSpotty);
      formData.append('mobile', selectedChat);
      formData.append('caption', messageInput);

      try {
        const response = await fetch('/api/upload-media', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          // Qui non chiamiamo più handleSendMessage separatamente
          // Invece, aggiorniamo lo stato dei messaggi direttamente
          props.onMessageSent({
            id: data.message_id,
            sender: "Me",
            content: messageInput,
            media_url: data.media_url,
            mime_type: data.mime_type,
            time: new Date().toISOString(),
            status: null,
            isSystem: false,
          });
          setSelectedFile(null);
          setPreviewUrl(null);
          setMessageInput('');
        } else {
          console.error('Errore nell\'upload del file');
        }
      } catch (error) {
        console.error('Errore nella richiesta di upload:', error);
      }
    } else {
      handleSendMessage();
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="flex flex-col p-3 bg-[#f0f2f5]">
      {previewUrl && (
        <div className="relative mb-2">
          <Image
            src={previewUrl}
            alt="Preview"
            width={200}
            height={200}
            className="object-contain rounded-lg"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 bg-white rounded-full"
            onClick={clearSelectedFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex items-center">
        <TemplateDialog
          isTemplateDialogOpen={isTemplateDialogOpen}
          setIsTemplateDialogOpen={setIsTemplateDialogOpen}
          handleSendMessage={handleSendMessage}
          codiceSpotty={codiceSpotty}
          selectedChat={selectedChat}
          scrollToBottom={scrollToBottom}
        />

        <div className="flex-grow mx-2">
          {isChatDisabled ? (
            <div
              onClick={() => setIsTemplateDialogOpen(true)}
              className="w-full bg-gray-200 text-gray-500 px-4 py-2 rounded cursor-pointer"
            >
              La chat è disabilitata. Clicca qui per selezionare un template.
            </div>
          ) : (
            <Input
              className="w-full"
              placeholder={selectedFile ? "Aggiungi una didascalia..." : "Scrivi un messaggio"}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSendWithMedia();
                }
              }}
            />
          )}
        </div>

        {isChatDisabled ? (
          <Button variant="ghost" className="text-[#54656f]" disabled>
            <Send className="w-6 h-6" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="text-[#54656f]"
            onClick={handleSendWithMedia}
          >
            <Send className="w-6 h-6" />
          </Button>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept="image/*,video/*,application/pdf"
        />

        <Button
          variant="ghost"
          className="text-[#54656f]"
          onClick={() => fileInputRef.current.click()}
        >
          <Paperclip className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
