import { MessageSquare } from "lucide-react";

export default function MessagesIndexPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 bg-gray-50/50">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #e0e4f7, #c8cce8)" }}
      >
        <MessageSquare className="w-8 h-8 text-[#2F3988]" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">Selecciona una conversación</p>
        <p className="text-xs text-gray-400 mt-1.5 max-w-[220px] leading-relaxed">
          O inicia una nueva usando el botón{" "}
          <span className="font-medium text-gray-600">✏️ en el panel izquierdo</span>
        </p>
      </div>
    </div>
  );
}
