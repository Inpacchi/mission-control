import { useState, useEffect, useRef } from 'react';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

interface UseFileContentOptions {
  onLoad?: (content: string) => void;
}

interface UseFileContentResult {
  content: string | null;
  loading: boolean;
  error: string | null;
}

export function useFileContent(
  filePath: string | undefined,
  projectPath: string,
  options?: UseFileContentOptions,
): UseFileContentResult {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Keep onLoad in a ref so the effect doesn't need to re-run when the callback identity changes
  const onLoadRef = useRef(options?.onLoad);
  onLoadRef.current = options?.onLoad;

  useEffect(() => {
    // Reset state on every path change before any async work
    setLoading(true);
    setContent(null);
    setError(null);

    if (!filePath) {
      setLoading(false);
      return;
    }

    // Path traversal guard: reject any path that escapes the project root
    const resolved = path.resolve(projectPath, filePath);
    const normalizedRoot = projectPath.endsWith(path.sep)
      ? projectPath
      : projectPath + path.sep;

    if (!resolved.startsWith(normalizedRoot) && resolved !== projectPath) {
      setError(`File path escapes project directory: ${resolved}`);
      setLoading(false);
      return;
    }

    let cancelled = false;

    readFile(resolved, 'utf-8')
      .then((text) => {
        if (!cancelled) {
          setContent(text);
          setLoading(false);
          onLoadRef.current?.(text);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setError(`Could not read file: ${message}`);
          setContent(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filePath, projectPath]);

  return { content, loading, error };
}
