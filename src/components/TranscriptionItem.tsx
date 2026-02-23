import { FileAudio, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export type TranscriptionStatus = "pending" | "uploading" | "transcribing" | "completed" | "error";

export interface TranscriptionSettings {
    apiKey: string;
    model: string;
    customModel: string;
    // Audio Intelligence
    summarize: boolean;
    topics: boolean;
    intents: boolean;
    detectEntities: boolean;
    sentiment: boolean;
    // Transcription
    smartFormat: boolean;
    keyterm: string;
    diarize: boolean;
    punctuate: boolean;
    paragraphs: boolean;
    utterances: boolean;
    profanityFilter: boolean;
    redact: string;
    replace: string;
    search: string;
    keywords: string;
    fillerWords: boolean;
    numerals: boolean;
}

export interface AudioFile {
    id: string;
    fileName: string;
    status: TranscriptionStatus;
    progress: number;
    result?: string;
    rawResponse?: any;
    settingsSnapshot?: TranscriptionSettings;
    error?: string;
}

interface TranscriptionItemProps {
    item: AudioFile;
}

export function TranscriptionItem({ item }: TranscriptionItemProps) {
    const isProcessing = item.status === "uploading" || item.status === "transcribing";
    const isDone = item.status === "completed";
    const isError = item.status === "error";

    const downloadMarkdown = () => {
        if (!item.rawResponse) return;

        const metadata = item.rawResponse.metadata;
        const results = item.rawResponse.results;

        let md = `# Transcription: ${item.fileName}\n\n`;
        md += `**Model:** ${metadata?.model_info?.name || "Unknown"} | **Duration:** ${metadata?.duration ? metadata.duration.toFixed(2) : 0}s\n\n`;

        // Audio Intelligence: Summary
        if (results?.summary?.short) {
            md += `## Summary\n${results.summary.short}\n\n`;
        }

        // Transcription / Diarization
        md += `## Transcript\n\n`;
        const alternatives = results?.channels?.[0]?.alternatives?.[0];
        if (alternatives) {
            if (alternatives.paragraphs?.paragraphs) {
                // Smart formatting / Paragraphs / Diarization
                alternatives.paragraphs.paragraphs.forEach((p: any) => {
                    if (p.speaker !== undefined) {
                        md += `**Speaker ${p.speaker}**\n`;
                    }
                    const text = p.sentences.map((s: any) => s.text).join(" ");
                    md += `${text}\n\n`;
                });
            } else {
                // Raw text fallback
                md += `${alternatives.transcript}\n\n`;
            }
        }

        // Audio Intelligence: Entities
        if (results?.entities?.entities?.length > 0) {
            md += `## Entities\n`;
            results.entities.entities.forEach((e: any) => {
                md += `- **${e.label}**: ${e.word}\n`;
            });
            md += `\n`;
        }

        // Audio Intelligence: Topics
        if (results?.topics?.segments?.length > 0) {
            md += `## Topics\n`;
            const allTopics = new Set<string>();
            results.topics.segments.forEach((seg: any) => {
                seg.topics.forEach((t: any) => allTopics.add(t.topic));
            });
            Array.from(allTopics).forEach(topic => md += `- ${topic}\n`);
            md += `\n`;
        }

        // Build blob and download
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${item.fileName.replace(/\.[^/.]+$/, "")}_transcript.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const renderTranscription = () => {
        const alts = item.rawResponse?.results?.channels?.[0]?.alternatives?.[0];
        if (!alts) return <p className="text-sm text-[#71717a]">{item.result}</p>;

        if (alts.paragraphs?.paragraphs) {
            return (
                <div className="flex flex-col gap-4 text-[13px] text-black">
                    {alts.paragraphs.paragraphs.map((p: any, i: number) => (
                        <div key={i} className="flex flex-col">
                            {p.speaker !== undefined && <span className="text-[11px] font-bold text-[#a1a1aa] uppercase tracking-wider mb-1">Speaker {p.speaker}</span>}
                            <p className="leading-relaxed">
                                {p.sentences.map((s: any) => s.text).join(" ")}
                            </p>
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <p className="whitespace-pre-wrap leading-relaxed text-black text-[13px]">
                {alts.transcript || item.result}
            </p>
        );
    };

    return (
        <div className="group relative flex flex-col gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-all hover:border-[#d1d5db]">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 overflow-hidden">
                    <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                        isError ? "border-red-100 bg-red-50 text-red-500" :
                            isDone ? "border-green-100 bg-green-50 text-green-600" :
                                "border-[#f4f4f5] bg-[#fafafa] text-[#a1a1aa]"
                    )}>
                        {isDone ? <CheckCircle2 className="h-5 w-5" /> :
                            isError ? <AlertCircle className="h-5 w-5" /> :
                                <FileAudio className="h-5 w-5" />}
                    </div>

                    <div className="flex flex-col overflow-hidden">
                        <span className="truncate font-semibold text-[14px] text-black tracking-tight">
                            {item.fileName}
                        </span>
                        <span className="text-[12px] text-[#71717a] capitalize font-medium mt-0.5 flex items-center gap-1">
                            {item.status}
                            {isProcessing && <span className="animate-pulse flex gap-0.5"><span className="w-1 h-1 bg-[#a1a1aa] rounded-full"></span><span className="w-1 h-1 bg-[#a1a1aa] rounded-full"></span><span className="w-1 h-1 bg-[#a1a1aa] rounded-full"></span></span>}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-[#a1a1aa]" />}
                    {isDone && item.rawResponse && (
                        <button
                            onClick={downloadMarkdown}
                            title="Download Markdown"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#e4e4e7] hover:bg-[#f4f4f5] text-[12px] font-medium text-[#3f3f46] transition-colors"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Export MD</span>
                        </button>
                    )}
                </div>
            </div>

            {isProcessing && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f4f4f5] border border-[#e5e7eb] mt-1">
                    <div
                        className="h-full bg-black transition-all duration-300 ease-out"
                        style={{ width: `${item.progress}%` }}
                    />
                </div>
            )}

            {/* Embedded results */}
            {isDone && item.rawResponse && (
                <div className="mt-3 rounded-lg bg-[#fafafa] p-4 border border-[#e4e4e7] max-h-64 overflow-y-auto w-full custom-scrollbar">

                    {/* Feature Badge Highlights */}
                    {item.rawResponse.results?.summary && (
                        <div className="mb-4 pb-4 border-b border-[#e4e4e7]">
                            <h4 className="text-[11px] font-bold text-[#a1a1aa] uppercase tracking-wider mb-2">Summary</h4>
                            <p className="text-[13px] text-black leading-relaxed">{item.rawResponse.results.summary.short}</p>
                        </div>
                    )}

                    {renderTranscription()}
                </div>
            )}

            {isError && item.error && (
                <div className="mt-2 rounded-lg bg-red-50 p-3 text-[13px] text-red-600 border border-red-100">
                    {item.error}
                </div>
            )}
        </div>
    );
}
