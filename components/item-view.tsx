"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { codeToHtml } from "shiki";
import { Item, CATEGORY_LABELS } from "@/lib/database.types";

interface ItemViewProps {
  item: Item;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const html = useMemo(() => {
    try {
      return codeToHtml(code, {
        lang: language || "text",
        theme: "github-light",
      });
    } catch {
      return code;
    }
  }, [code, language]);

  return (
    <div
      className="overflow-x-auto rounded-lg border border-gray-200"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function ItemView({ item }: ItemViewProps) {
  const [mode, setMode] = useState<"rendered" | "raw">("rendered");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-black transition-colors"
          >
            ← Volver a la galería
          </Link>
          <h1 className="text-lg font-semibold tracking-tight text-black">
            {item.title}
          </h1>
          <div className="w-20" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            {CATEGORY_LABELS[item.category]}
          </span>
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      {/* Toggle and Copy */}
      <div className="flex items-center justify-between border-b border-gray-200 px-8 py-3">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setMode("rendered")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "rendered"
                ? "bg-white text-black shadow-sm"
                : "text-gray-600 hover:text-black"
            }`}
          >
            Rendered
          </button>
          <button
            onClick={() => setMode("raw")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "raw"
                ? "bg-white text-black shadow-sm"
                : "text-gray-600 hover:text-black"
            }`}
          >
            Raw
          </button>
        </div>
        <button
          onClick={handleCopy}
          className="rounded-md border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
        >
          {copied ? "✓ Copiado" : "Copiar contenido"}
        </button>
      </div>

      {/* Content */}
      <main className="p-8">
        {mode === "rendered" ? (
          <div className="prose prose-sm max-w-none text-black">
            <ReactMarkdown
              components={{
                code(props) {
                  const { children, className, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline = !match;
                  const language = match?.[1];

                  if (isInline) {
                    return (
                      <code
                        {...rest}
                        className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-gray-800"
                      >
                        {children}
                      </code>
                    );
                  }

                  const code = String(children).replace(/\n$/, "");
                  return <CodeBlock code={code} language={language} />;
                },
              }}
            >
              {item.content}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
            {item.content}
          </pre>
        )}
      </main>
    </div>
  );
}