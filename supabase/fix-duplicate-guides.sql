-- Elimina duplicados de "Guía de inicio rápido", conservando el más antiguo por workspace
DELETE FROM documents
WHERE title = 'Guía de inicio rápido'
  AND id NOT IN (
    SELECT DISTINCT ON (workspace_id) id
    FROM documents
    WHERE title = 'Guía de inicio rápido'
    ORDER BY workspace_id, created_at ASC
  );
