"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { Progress } from "@/components/ui/progress";

interface FileUploadProps {
  onChange: (res?: { url: string; name: string }) => void;
  endpoint: "courseImage" | "courseAttachment" | "chapterVideo";
}

export const FileUpload = ({
  onChange,
  endpoint,
}: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string>("");

  const config = useMemo(() => {
    if (endpoint === "courseImage") {
      return { folder: "images/courses", accept: "image/*" };
    }
    if (endpoint === "chapterVideo") {
      return { folder: "videos/chapters", accept: "video/*" };
    }
    // courseAttachment can be image/video/pdf/anything
    return { folder: "uploads/attachments", accept: "" };
  }, [endpoint]);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setProgress(0);
      setFileName(file.name);

      try {
        // More specific folder by MIME when endpoint is generic attachments
        let folder = config.folder;
        if (endpoint === "courseAttachment") {
          if (file.type.startsWith("image/")) folder = "images/attachments";
          else if (file.type.startsWith("video/")) folder = "videos/attachments";
          else folder = "documents/attachments";
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const response = await fetch("/api/r2/upload", { method: "POST", body: formData });
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || `Upload failed (${response.status})`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";

          for (const chunk of chunks) {
            const line = chunk.trim();
            if (!line.startsWith("data:")) continue;
            const json = line.replace(/^data:\s*/, "");
            if (!json) continue;

            const data = JSON.parse(json);
            if (typeof data.progress === "number") {
              setProgress(data.progress);
              continue;
            }
            if (data.done && data.url) {
              setProgress(100);
              onChange({ url: data.url, name: data.name || file.name });
              toast.success("File uploaded successfully!");
              return;
            }
            if (data.error) {
              throw new Error(data.error);
            }
          }
        }

        throw new Error("Upload stream ended unexpectedly");
      } catch (err: any) {
        toast.error(err?.message || "Failed to upload file");
      } finally {
        setUploading(false);
      }
    },
    [config.folder, endpoint, onChange]
  );

  const onPickFile = useCallback(() => inputRef.current?.click(), []);

  const onInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await uploadFile(file);
      // allow re-selecting same file
      e.target.value = "";
    },
    [uploadFile]
  );

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (uploading) return;
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      await uploadFile(file);
    },
    [uploadFile, uploading]
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={config.accept}
        className="hidden"
        onChange={onInputChange}
      />

      {uploading ? (
        <div className="space-y-2 rounded-md border bg-card p-4">
          <div className="text-sm font-medium truncate">{fileName}</div>
          <Progress value={progress} />
          <div className="text-xs text-muted-foreground">{progress}%</div>
        </div>
      ) : (
        <div
          onClick={onPickFile}
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="cursor-pointer rounded-md border border-dashed p-6 text-center hover:bg-muted/50 transition"
        >
          <div className="text-sm font-medium">Click to upload</div>
          <div className="text-xs text-muted-foreground mt-1">or drag & drop a file here</div>
        </div>
      )}
    </div>
  );
};