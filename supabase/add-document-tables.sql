-- Add missing columns to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '📄';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id uuid;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE documents ALTER COLUMN content TYPE text USING COALESCE(content::text, '');

-- document_folders
CREATE TABLE IF NOT EXISTS document_folders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  icon         text NOT NULL DEFAULT '📂',
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage document folders"
  ON document_folders FOR ALL USING (is_workspace_member(workspace_id));

-- FK from documents to document_folders
ALTER TABLE documents ADD CONSTRAINT documents_folder_id_fkey
  FOREIGN KEY (folder_id) REFERENCES document_folders(id) ON DELETE SET NULL;

-- document_comments
CREATE TABLE IF NOT EXISTS document_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES auth.users(id),
  text        text NOT NULL,
  resolved    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members can manage document comments"
  ON document_comments FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_comments.document_id
        AND is_workspace_member(d.workspace_id)
    )
  );
