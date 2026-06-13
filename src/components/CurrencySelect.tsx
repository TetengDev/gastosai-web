import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface CurrencyOption {
  code: string;
  country: string;
  flag: string;
}

const CURRENCIES: CurrencyOption[] = [
  { code: "PHP", country: "Philippines",    flag: "ph" },
  { code: "USD", country: "United States",  flag: "us" },
  { code: "EUR", country: "European Union", flag: "eu" },
  { code: "SGD", country: "Singapore",      flag: "sg" },
  { code: "JPY", country: "Japan",          flag: "jp" },
  { code: "GBP", country: "United Kingdom", flag: "gb" },
  { code: "AUD", country: "Australia",      flag: "au" },
];

function flagUrl(flag: string) {
  return `https://flagcdn.com/20x15/${flag}.png`;
}

interface Props {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export default function CurrencySelect({ value, onChange, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = CURRENCIES.find((c) => c.code === value) ?? CURRENCIES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow text-left"
      >
        <img
          src={flagUrl(selected.flag)}
          alt={selected.country}
          width={20}
          height={15}
          className="rounded-sm flex-shrink-0"
        />
        <span className="font-medium">{selected.code}</span>
        <span className="text-gray-400 dark:text-gray-500 flex-1">{selected.country}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          {CURRENCIES.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => { onChange(c.code); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  c.code === value ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" : "text-gray-900 dark:text-gray-100"
                }`}
              >
                <img
                  src={flagUrl(c.flag)}
                  alt={c.country}
                  width={20}
                  height={15}
                  className="rounded-sm flex-shrink-0"
                />
                <span className="font-medium w-10">{c.code}</span>
                <span className="text-gray-500 dark:text-gray-400">{c.country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
