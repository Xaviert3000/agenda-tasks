"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  BookOpen, ChevronDown, ChevronRight, Plus, Search,
  Folder, FilePlus, FolderPlus, Trash2, MoreHorizontal,
  FolderInput, FolderMinus,
} from "lucide-react";
import { useDocsStore } from "@/lib/store/docsStore";
import type { Doc, DocFolder } from "@/lib/store/docsStore";
import { cn } from "@/lib/utils";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const params    = useParams();
  const pathname  = usePathname();
  const router    = useRouter();
  const workspace = params.workspace as string;

  const activeDocId = pathname.match(/\/docs\/([^/]+)/)?.[1];

  const { docs, folders, addDoc, addFolder, deleteDoc, moveDoc } = useDocsStore();

  const [search, setSearch]           = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["folder-1", "folder-2"])
  );
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName]         = useState("");
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creatingFolder) setTimeout(() => folderInputRef.current?.focus(), 50);
  }, [creatingFolder]);

  const toggleFolder = (id: string) =>
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleNewDoc = (folderId?: string) => {
    const id = addDoc(folderId);
    if (folderId) setExpandedFolders((p) => new Set([...p, folderId]));
    router.push(`/${workspace}/docs/${id}`);
  };

  const handleCreateFolder = () => {
    if (folderName.trim()) addFolder(folderName.trim());
    setCreatingFolder(false);
    setFolderName("");
  };

  const q             = search.trim().toLowerCase();
  const filteredDocs  = q ? docs.filter((d) => d.title.toLowerCase().includes(q)) : docs;
  const docsInFolder  = (folderId: string) => filteredDocs.filter((d) => d.folderId === folderId);
  const rootDocs      = filteredDocs.filter((d) => !d.folderId);

  const handleDeleteDoc = (id: string) => {
    deleteDoc(id);
    if (id === activeDocId) router.push(`/${workspace}/docs`);
  };

  const handleMoveDoc = (docId: string, folderId: string | undefined) => {
    moveDoc(docId, folderId);
    // If moving INTO a folder, expand it
    if (folderId) setExpandedFolders((p) => new Set([...p, folderId]));
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left panel ── */}
      <aside className="w-[240px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#2F3988]" />
              <span className="text-sm font-bold text-gray-800">Documentos</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => { setCreatingFolder(true); setFolderName(""); }}
                title="Nueva carpeta"
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleNewDoc()}
                title="Nuevo documento"
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FilePlus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-gray-50 border border-gray-100 rounded-lg outline-none focus:border-[#9ACCEC]/60 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto py-2">
          {/* New-folder form */}
          {creatingFolder && (
            <div className="px-3 mb-2">
              <div className="flex items-center gap-1.5 border border-[#9ACCEC]/50 rounded-lg px-2 py-1.5 bg-blue-50/40">
                <Folder className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <input
                  ref={folderInputRef}
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")  handleCreateFolder();
                    if (e.key === "Escape") { setCreatingFolder(false); setFolderName(""); }
                  }}
                  onBlur={handleCreateFolder}
                  placeholder="Nombre de la carpeta"
                  className="flex-1 text-xs text-gray-800 bg-transparent outline-none placeholder:text-gray-400"
                />
              </div>
            </div>
          )}

          {/* Folders */}
          {folders.map((folder) => {
            const folderDocs = docsInFolder(folder.id);
            const isExpanded = expandedFolders.has(folder.id);

            return (
              <div key={folder.id} className="mb-0.5">
                <div className="group flex items-center gap-1 px-2 py-1 mx-1 rounded-md hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="flex-1 flex items-center gap-1.5 min-w-0 text-left"
                  >
                    <span className="w-4 flex-shrink-0 flex items-center justify-center">
                      {isExpanded
                        ? <ChevronDown className="w-3 h-3 text-gray-400" />
                        : <ChevronRight className="w-3 h-3 text-gray-400" />}
                    </span>
                    <span className="text-sm leading-none">{folder.icon}</span>
                    <span className="flex-1 text-xs font-semibold text-gray-700 truncate">
                      {folder.name}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium mr-1">
                      {folderDocs.length}
                    </span>
                  </button>
                  <button
                    onClick={() => handleNewDoc(folder.id)}
                    title="Nuevo documento"
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="ml-6 pl-2 border-l border-gray-100 space-y-0.5 pb-1">
                    {folderDocs.map((doc) => (
                      <DocTreeItem
                        key={doc.id}
                        doc={doc}
                        workspace={workspace}
                        isActive={doc.id === activeDocId}
                        folders={folders}
                        onDelete={() => handleDeleteDoc(doc.id)}
                        onMove={(folderId) => handleMoveDoc(doc.id, folderId)}
                      />
                    ))}
                    {folderDocs.length === 0 && (
                      <button
                        onClick={() => handleNewDoc(folder.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Agregar documento</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Root docs */}
          {rootDocs.length > 0 && (
            <div className={cn("px-1 space-y-0.5", folders.length > 0 && "mt-2 pt-2 border-t border-gray-50")}>
              {rootDocs.map((doc) => (
                <DocTreeItem
                  key={doc.id}
                  doc={doc}
                  workspace={workspace}
                  isActive={doc.id === activeDocId}
                  folders={folders}
                  onDelete={() => handleDeleteDoc(doc.id)}
                  onMove={(folderId) => handleMoveDoc(doc.id, folderId)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {docs.length === 0 && !creatingFolder && (
            <div className="flex flex-col items-center py-10 px-4 text-center">
              <BookOpen className="w-7 h-7 text-gray-300 mb-2" />
              <p className="text-xs text-gray-400 mb-3">Sin documentos aún</p>
              <button
                onClick={() => handleNewDoc()}
                className="text-xs text-[#2F3988] font-medium hover:underline"
              >
                + Crear el primero
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 overflow-hidden bg-white">
        {children}
      </div>
    </div>
  );
}

/* ── DocTreeItem ── */
function DocTreeItem({
  doc,
  workspace,
  isActive,
  folders,
  onDelete,
  onMove,
}: {
  doc: Doc;
  workspace: string;
  isActive: boolean;
  folders: DocFolder[];
  onDelete: () => void;
  onMove: (folderId: string | undefined) => void;
}) {
  const [showMenu, setShowMenu]     = useState(false);
  const [showMove, setShowMove]     = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) { setShowMove(false); return; }
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setShowMenu(false);
        setShowMove(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  // Folders the doc can move to (exclude its current folder)
  const moveTargets = folders.filter((f) => f.id !== doc.folderId);
  const isInFolder  = !!doc.folderId;

  return (
    <div className="group relative flex items-center">
      <Link
        href={`/${workspace}/docs/${doc.id}`}
        className={cn(
          "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors min-w-0 pr-6",
          isActive
            ? "bg-blue-50 text-[#2F3988] font-medium"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        )}
      >
        <span className="text-sm leading-none flex-shrink-0">{doc.icon}</span>
        <span className="flex-1 truncate">{doc.title}</span>
      </Link>

      {/* Context menu */}
      <div ref={menuRef} className="absolute right-1 flex-shrink-0">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu((p) => !p); }}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <MoreHorizontal className="w-3 h-3" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-48">

            {/* Mover a carpeta — toggles inline list */}
            <button
              onClick={() => setShowMove((p) => !p)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FolderInput className="w-3 h-3 text-gray-400" />
              <span className="flex-1 text-left">Mover a carpeta</span>
              <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform", showMove && "rotate-180")} />
            </button>

            {/* Inline folder picker */}
            {showMove && (
              <div className="mx-2 mb-1 border border-gray-100 rounded-lg overflow-hidden bg-gray-50">
                {/* Sin carpeta — solo si ya está en una */}
                {isInFolder && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMove(undefined); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-white transition-colors border-b border-gray-100"
                  >
                    <FolderMinus className="w-3 h-3 text-gray-400" />
                    <span>Sin carpeta</span>
                  </button>
                )}

                {moveTargets.length === 0 && !isInFolder ? (
                  <p className="px-3 py-2 text-[11px] text-gray-400">No hay carpetas disponibles</p>
                ) : (
                  moveTargets.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={(e) => { e.stopPropagation(); onMove(folder.id); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-[#2F3988]/5 hover:text-[#2F3988] transition-colors"
                    >
                      <span className="text-sm leading-none">{folder.icon}</span>
                      <span className="truncate">{folder.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="my-1 border-t border-gray-100" />

            {/* Eliminar */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Eliminar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
