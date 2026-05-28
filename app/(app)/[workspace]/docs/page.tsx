"use client";

import { useParams, useRouter } from "next/navigation";
import { BookOpen, FilePlus } from "lucide-react";
import { useDocsStore } from "@/lib/store/docsStore";

export default function DocsIndexPage() {
  const params    = useParams();
  const router    = useRouter();
  const workspace = params.workspace as string;
  const { addDoc } = useDocsStore();

  const handleNewDoc = () => {
    const id = addDoc();
    router.push(`/${workspace}/docs/${id}`);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-50/40 select-none">
      <div className="flex flex-col items-center text-center max-w-xs">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
          <BookOpen className="w-7 h-7 text-[#2F3988]" />
        </div>
        <h2 className="text-base font-bold text-gray-800 mb-1">
          Selecciona un documento
        </h2>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
          Elige un documento de la lista de la izquierda o crea uno nuevo para empezar.
        </p>
        <button
          onClick={handleNewDoc}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: "#2F3988" }}
        >
          <FilePlus className="w-4 h-4" />
          Nuevo documento
        </button>
      </div>
    </div>
  );
}
