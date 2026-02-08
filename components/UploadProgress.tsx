"use client";

interface UploadProgressProps {
  fileName: string;
  sent: number;
  total: number;
}

export default function UploadProgress({ fileName, sent, total }: UploadProgressProps) {
  return (
    <div
      style={{
        padding: 8,
        background: "#1a1a1a",
        borderTop: "1px solid #333",
        fontSize: 10,
      }}
    >
      <div style={{ marginBottom: 4 }}>正在上传: {fileName}</div>
      <div
        style={{
          background: "#333",
          height: 4,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#0f0",
            height: "100%",
            width: `${(sent / total) * 100}%`,
            transition: "width 0.1s",
          }}
        />
      </div>
      <div style={{ marginTop: 4, opacity: 0.7 }}>
        {sent} / {total} 分块
      </div>
    </div>
  );
}
