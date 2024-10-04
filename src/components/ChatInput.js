import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export default function ChatInput({ messageInput, setMessageInput, handleSendMessage, isChatDisabled }) {
  return (
    <div className="flex items-center p-3 bg-[#f0f2f5]">
      <div className="flex-grow mx-2">
        {isChatDisabled ? (
          <div className="w-full bg-gray-200 text-gray-500 px-4 py-2 rounded cursor-pointer">
            La chat è disabilitata.
          </div>
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
      <Button variant="ghost" className="text-[#54656f]" onClick={() => handleSendMessage()} disabled={isChatDisabled}>
        <Send className="w-6 h-6" />
      </Button>
    </div>
  );
}
