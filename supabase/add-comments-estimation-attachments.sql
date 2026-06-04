-- ─────────────────────────────────────────────────────────────
-- 1. Estimación — columna en tasks (más simple y normalizado)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimation text;

-- ─────────────────────────────────────────────────────────────
-- 2. Comentarios de tareas
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

-- Actualizar comment_count automáticamente
CREATE OR REPLACE FUNCTION sync_task_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tasks SET comment_count = comment_count + 1, updated_at = now()
    WHERE id = NEW.task_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tasks SET comment_count = GREATEST(comment_count - 1, 0), updated_at = now()
    WHERE id = OLD.task_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_comment_count ON task_comments;
CREATE TRIGGER trg_task_comment_count
AFTER INSERT OR DELETE ON task_comments
FOR EACH ROW EXECUTE FUNCTION sync_task_comment_count();

-- RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read comments"
ON task_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN kanban_lists kl ON kl.id = t.list_id
    JOIN projects p      ON p.id  = kl.project_id
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE t.id = task_comments.task_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "workspace members can insert comments"
ON task_comments FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN kanban_lists kl ON kl.id = t.list_id
    JOIN projects p      ON p.id  = kl.project_id
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE t.id = task_comments.task_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "author can delete own comments"
ON task_comments FOR DELETE
USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 3. Adjuntos de tareas
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_attachments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_by    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          text NOT NULL,
  size_bytes    bigint NOT NULL DEFAULT 0,
  mime_type     text NOT NULL DEFAULT '',
  storage_path  text NOT NULL,          -- path en el bucket "task-attachments"
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);

-- Actualizar attachment_count automáticamente
CREATE OR REPLACE FUNCTION sync_task_attachment_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tasks SET attachment_count = attachment_count + 1, updated_at = now()
    WHERE id = NEW.task_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tasks SET attachment_count = GREATEST(attachment_count - 1, 0), updated_at = now()
    WHERE id = OLD.task_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_attachment_count ON task_attachments;
CREATE TRIGGER trg_task_attachment_count
AFTER INSERT OR DELETE ON task_attachments
FOR EACH ROW EXECUTE FUNCTION sync_task_attachment_count();

-- RLS
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read attachments"
ON task_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN kanban_lists kl ON kl.id = t.list_id
    JOIN projects p      ON p.id  = kl.project_id
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE t.id = task_attachments.task_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "workspace members can insert attachments"
ON task_attachments FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN kanban_lists kl ON kl.id = t.list_id
    JOIN projects p      ON p.id  = kl.project_id
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE t.id = task_attachments.task_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "uploader can delete own attachments"
ON task_attachments FOR DELETE
USING (created_by = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 4. Storage bucket para archivos adjuntos
--    (ejecutar por separado si falla — requiere extensión storage)
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  true,
  26214400,   -- 25 MB
  ARRAY['image/png','image/jpeg','image/gif','image/webp','image/svg+xml',
        'application/pdf','video/mp4','audio/mpeg',
        'application/zip','application/x-rar-compressed',
        'application/octet-stream','text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "auth users can upload task attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "auth users can read task attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "uploader can delete task attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'task-attachments' AND owner = auth.uid());
