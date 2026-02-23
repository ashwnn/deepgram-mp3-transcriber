"use client";

import { Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
    onFilesSelected: (files: File[]) => void;
    disabled?: boolean;
}

export function FileUpload({ onFilesSelected, disabled }: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (disabled) return;

            const files = Array.from(e.dataTransfer.files).filter(
                (file) => file.type.startsWith("audio/") || file.name.endsWith(".mp3")
            );
            if (files.length > 0) {
                onFilesSelected(files);
            }
        },
        [disabled, onFilesSelected]
    );

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && !disabled) {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    onFilesSelected(files);
                }
            }
        },
        [disabled, onFilesSelected]
    );

    return (
        <div
            className={cn(
                "relative w-full rounded-2xl border-2 border-dashed border-[#e5e7eb] transition-all duration-200 ease-in-out",
                "flex flex-col items-center justify-center py-20 text-center",
                "bg-white",
                isDragging && "border-[#d1d5db] bg-[#fdfdfd]",
                disabled && "opacity-60 cursor-not-allowed",
                !disabled && "hover:border-[#d1d5db] hover:bg-[#fafafa] cursor-pointer"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && document.getElementById("file-upload")?.click()}
        >
            <input
                id="file-upload"
                type="file"
                multiple
                accept="audio/*,.mp3"
                className="hidden"
                onChange={handleFileInput}
                disabled={disabled}
            />

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f4f5]">
                <Upload className="h-6 w-6 text-black" strokeWidth={1.5} />
            </div>

            <h3 className="text-base font-semibold text-black tracking-tight mb-1">Click to upload MP3</h3>
            <p className="text-sm text-[#71717a]">
                Maximum file size: 25MB
            </p>
        </div>
    );
}
