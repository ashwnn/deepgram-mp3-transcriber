"use client";

import { useEffect, useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { TranscriptionItem, AudioFile, TranscriptionSettings } from "@/components/TranscriptionItem";
import { Key, Settings2, Trash2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Unified Settings State
  const [settings, setSettings] = useState<TranscriptionSettings>({
    apiKey: "",
    model: "nova-3",
    customModel: "",
    // Audio Intelligence
    summarize: false,
    topics: false,
    intents: false,
    detectEntities: false,
    sentiment: false,
    // Transcription
    smartFormat: false,
    keyterm: "",
    diarize: false,
    punctuate: false,
    paragraphs: false,
    utterances: false,
    profanityFilter: false,
    redact: "",
    replace: "",
    search: "",
    keywords: "",
    fillerWords: false,
    numerals: false,
  });

  // Load state from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("deepgram_settings_v2");
    const savedFiles = localStorage.getItem("deepgram_history_v2");

    if (savedSettings) {
      try { setSettings(JSON.parse(savedSettings)); } catch (e) { }
    }

    if (savedFiles) {
      try {
        const parsedFiles = JSON.parse(savedFiles) as AudioFile[];
        setFiles(parsedFiles.filter(f => f.status === "completed" || f.status === "error"));
      } catch (e) { }
    }

    setIsLoaded(true);
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("deepgram_settings_v2", JSON.stringify(settings));
      localStorage.setItem("deepgram_history_v2", JSON.stringify(files));
    }
  }, [settings, files, isLoaded]);

  const updateSetting = <K extends keyof TranscriptionSettings>(key: K, value: TranscriptionSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    if (!settings.apiKey) return;

    const newFiles: AudioFile[] = selectedFiles.map((f) => ({
      id: Math.random().toString(36).substring(7),
      fileName: f.name,
      status: "pending",
      progress: 0,
      settingsSnapshot: { ...settings } // Capture current settings for this job
    }));

    setFiles((prev) => [...newFiles, ...prev]);

    newFiles.forEach((fileObj, index) => {
      transcribeFile(fileObj.id, selectedFiles[index], settings);
    });
  };

  const transcribeFile = async (id: string, file: File, currentSettings: TranscriptionSettings) => {
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, status: "uploading", progress: 20 } : f)));

    const targetModel = currentSettings.customModel.trim() !== "" ? currentSettings.customModel.trim() : currentSettings.model;
    const url = new URL("https://api.deepgram.com/v1/listen");

    url.searchParams.append("model", targetModel);

    // Append Audio Intelligence
    if (currentSettings.summarize) url.searchParams.append("summarize", "v2"); // Deepgram expects 'v2' usually, or true
    if (currentSettings.topics) url.searchParams.append("topics", "true");
    if (currentSettings.intents) url.searchParams.append("intents", "true");
    if (currentSettings.detectEntities) url.searchParams.append("detect_entities", "true");
    if (currentSettings.sentiment) url.searchParams.append("sentiment", "true");

    // Append Transcription Formatting
    if (currentSettings.smartFormat) url.searchParams.append("smart_format", "true");
    if (currentSettings.diarize) url.searchParams.append("diarize", "true");
    if (currentSettings.punctuate || currentSettings.paragraphs || currentSettings.summarize) url.searchParams.append("punctuate", "true");
    if (currentSettings.paragraphs) url.searchParams.append("paragraphs", "true");
    if (currentSettings.utterances) url.searchParams.append("utterances", "true");
    if (currentSettings.profanityFilter) url.searchParams.append("profanity_filter", "true");
    if (currentSettings.fillerWords) url.searchParams.append("filler_words", "true");
    if (currentSettings.numerals) url.searchParams.append("numerals", "true");

    // Text inputs
    if (currentSettings.keyterm) {
      currentSettings.keyterm.split(',').forEach(term => {
        url.searchParams.append("keyterm", term.trim());
      });
    }
    if (currentSettings.keywords) {
      currentSettings.keywords.split(',').forEach(kw => {
        url.searchParams.append("keywords", kw.trim());
      });
    }
    if (currentSettings.redact) {
      currentSettings.redact.split(',').forEach(r => {
        url.searchParams.append("redact", r.trim());
      });
    }
    if (currentSettings.replace) {
      currentSettings.replace.split(',').forEach(r => {
        url.searchParams.append("replace", r.trim());
      });
    }
    if (currentSettings.search) {
      currentSettings.search.split(',').forEach(s => {
        url.searchParams.append("search", s.trim());
      });
    }

    try {
      setFiles(prev => prev.map(f => (f.id === id ? { ...f, status: "transcribing", progress: 60 } : f)));

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Authorization": `Token ${currentSettings.apiKey}`,
          "Content-Type": file.type || "audio/mp3",
        },
        body: file,
      });

      if (!response.ok) {
        let errStr = response.statusText;
        try { const errObj = await response.json(); errStr = errObj.err_msg || errStr; } catch (e) { }
        throw new Error(`API error: ${response.status} ${errStr}`);
      }

      const data = await response.json();

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
              ...f,
              status: "completed",
              progress: 100,
              result: data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "No transcription found.",
              rawResponse: data, // Save raw for Markdown export limits
            }
            : f
        )
      );
    } catch (error: any) {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, status: "error", progress: 0, error: error.message || "Unknown error." } : f));
    }
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your transcription history?")) {
      setFiles([]);
    }
  };

  if (!isLoaded) return null;

  return (
    <main className="mx-auto max-w-[800px] px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-[32px] font-bold tracking-tight text-black mb-2">
          MP3 Transcriber
        </h1>
        <p className="text-[15px] text-[#71717a]">
          Convert your audio files to text using Deepgram.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Top Settings Card */}
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm overflow-hidden">
          <div className="grid gap-6 md:grid-cols-2">
            {/* API Key */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-1.5 text-[13px] font-semibold text-[#18181b]">
                <Key className="h-3.5 w-3.5" />
                API Key
              </label>
              <input
                type="password"
                placeholder="dg_..."
                value={settings.apiKey}
                onChange={(e) => updateSetting("apiKey", e.target.value)}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-[14px] text-black placeholder:text-[#a1a1aa] outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
              />
            </div>

            {/* Model */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-1.5 text-[13px] font-semibold text-[#18181b]">
                <Settings2 className="h-3.5 w-3.5" />
                Model
              </label>
              <select
                value={settings.model}
                onChange={(e) => updateSetting("model", e.target.value)}
                className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-[14px] text-black outline-none focus:border-black focus:ring-1 focus:ring-black transition-all appearance-none"
              >
                <option value="nova-3">Nova-3 (Recommended)</option>
                <option value="nova-2">Nova-2</option>
                <option value="nova-2-general">Nova-general</option>
                <option value="whisper-large">Whisper Large</option>
              </select>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="mt-4 pt-4 border-t border-[#f4f4f5]">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-[13px] font-semibold text-[#71717a] hover:text-black transition-colors"
            >
              <span>Advanced Settings</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAdvanced && (
              <div className="mt-4 grid gap-8 md:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-300">

                {/* Audio Intelligence */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-bold text-[#a1a1aa] uppercase tracking-wider">Audio Intelligence</h3>
                  <Toggle label="Summarization" checked={settings.summarize} onChange={(v) => updateSetting("summarize", v)} />
                  <Toggle label="Topic Detection" checked={settings.topics} onChange={(v) => updateSetting("topics", v)} />
                  <Toggle label="Intent Recognition" checked={settings.intents} onChange={(v) => updateSetting("intents", v)} />
                  <Toggle label="Entity Detection" checked={settings.detectEntities} onChange={(v) => updateSetting("detectEntities", v)} />
                  <Toggle label="Sentiment Analysis" checked={settings.sentiment} onChange={(v) => updateSetting("sentiment", v)} />
                </div>

                {/* Transcription Options */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-bold text-[#a1a1aa] uppercase tracking-wider">Transcription</h3>
                  <Toggle label="Smart Format" checked={settings.smartFormat} onChange={(v) => updateSetting("smartFormat", v)} />
                  <Toggle label="Speaker Diarization" checked={settings.diarize} onChange={(v) => updateSetting("diarize", v)} />
                  <Toggle label="Paragraphs" checked={settings.paragraphs} onChange={(v) => updateSetting("paragraphs", v)} />
                  <Toggle label="Punctuation" checked={settings.punctuate} onChange={(v) => updateSetting("punctuate", v)} disabled={settings.paragraphs || settings.summarize} />
                  <Toggle label="Utterances" checked={settings.utterances} onChange={(v) => updateSetting("utterances", v)} />
                  <Toggle label="Profanity Filter" checked={settings.profanityFilter} onChange={(v) => updateSetting("profanityFilter", v)} />
                  <Toggle label="Filler Words" checked={settings.fillerWords} onChange={(v) => updateSetting("fillerWords", v)} />
                  <Toggle label="Numerals" checked={settings.numerals} onChange={(v) => updateSetting("numerals", v)} />
                </div>

                {/* Text Inputs */}
                <div className="md:col-span-2 flex flex-col gap-4">
                  <h3 className="text-[11px] font-bold text-[#a1a1aa] uppercase tracking-wider">Parameters (Comma Separated)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <TextInput label="Custom Fine-tuned Model ID" value={settings.customModel} onChange={(v) => updateSetting("customModel", v)} placeholder="Overrides Base Model" />
                    <TextInput label="Keyterms" value={settings.keyterm} onChange={(v) => updateSetting("keyterm", v)} placeholder="Deepgram, React, NextJS" />
                    <TextInput label="Redaction" value={settings.redact} onChange={(v) => updateSetting("redact", v)} placeholder="pci, ssn, numbers" />
                    <TextInput label="Find & Replace" value={settings.replace} onChange={(v) => updateSetting("replace", v)} placeholder="find:replace, hello:hi" />
                    <TextInput label="Search" value={settings.search} onChange={(v) => updateSetting("search", v)} placeholder="term or phrase" />
                    <TextInput label="Keywords (Boost)" value={settings.keywords} onChange={(v) => updateSetting("keywords", v)} placeholder="keyword:1.5" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Zone */}
        <FileUpload onFilesSelected={handleFilesSelected} disabled={!settings.apiKey} />

        {/* Warning Pill */}
        {!settings.apiKey && (
          <div className="flex justify-center -mt-2">
            <div className="flex items-center gap-2 rounded-full bg-[#f4f4f5] px-4 py-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-[#a1a1aa]" />
              <span className="text-[12px] font-medium text-[#71717a]">API Key is required to start transcription</span>
            </div>
          </div>
        )}

      </div>

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="mt-12 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-[14px] font-semibold text-black">
              Transcriptions
            </h2>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[#71717a] hover:text-black transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear History
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {files.map((file) => (
              <TranscriptionItem key={file.id} item={file} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

// Reusable micro-components for settings
function Toggle({ label, checked, onChange, disabled }: { label: string, checked: boolean, onChange: (v: boolean) => void, disabled?: boolean }) {
  return (
    <label className={cn("flex items-center justify-between group", disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer")}>
      <span className="text-[13px] text-[#3f3f46] group-hover:text-black transition-colors">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-[#d4d4d8] text-black focus:ring-black accent-black"
      />
    </label>
  );
}

function TextInput({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] text-[#3f3f46] font-medium">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-[#e4e4e7] bg-white px-2.5 py-1.5 text-[13px] text-black placeholder:text-[#a1a1aa] outline-none focus:border-black"
      />
    </div>
  )
}
