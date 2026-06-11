import { useState } from "react";
import type { Category } from "../api/types";

interface Props {
  categories: Category[];
  value: string;
  onChange: (name: string, id: number | null) => void;
  onCreateCategory?: (name: string) => void | Promise<void>;
  allowCreate?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function CategoryCombobox({
  categories,
  value,
  onChange,
  onCreateCategory,
  allowCreate = true,
  disabled = false,
  placeholder = "Select category",
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);

  const displayValue = focused ? inputValue : value;

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(inputValue.toLowerCase())
  );
  const exactMatch = categories.find(
    (c) => c.name.toLowerCase() === inputValue.toLowerCase()
  );
  const showCreate = allowCreate && focused && inputValue.trim().length > 0 && !exactMatch;

  const handleFocus = () => {
    setInputValue(value);
    setFocused(true);
    setOpen(true);
  };

  const handleBlur = () => {
    setFocused(false);
    setOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setInputValue(q);
    if (allowCreate) {
      const match = categories.find((c) => c.name.toLowerCase() === q.toLowerCase());
      onChange(q, match?.id ?? null);
    }
  };

  const selectCategory = (name: string, id: number | null) => {
    setFocused(false);
    setOpen(false);
    onChange(name, id);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={displayValue}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:placeholder-gray-500 disabled:opacity-60 disabled:cursor-not-allowed"
      />
      {open && !disabled && (filtered.length > 0 || showCreate) && (
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((c) => (
            <li
              key={c.id}
              onMouseDown={(e) => { e.preventDefault(); selectCategory(c.name, c.id); }}
              className="px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer"
            >
              {c.name}
            </li>
          ))}
          {showCreate && (
            <li
              onMouseDown={(e) => {
                e.preventDefault();
                if (onCreateCategory) {
                  void onCreateCategory(inputValue.trim());
                  setFocused(false);
                  setOpen(false);
                } else {
                  selectCategory(inputValue.trim(), null);
                }
              }}
              className="px-4 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer border-t border-gray-100 dark:border-gray-800 flex items-center gap-2"
            >
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-semibold">
                Create
              </span>
              <span className="text-gray-700 dark:text-gray-300">"{inputValue.trim()}"</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
