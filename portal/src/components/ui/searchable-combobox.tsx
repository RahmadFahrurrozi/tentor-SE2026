import * as React from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

export interface SearchableComboboxOption {
  value: string;
  label: string;
}

export interface SearchableComboboxProps {
  options: SearchableComboboxOption[];
  value?: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Pilih atau cari...",
  emptyText = "Tidak ada hasil ditemukan.",
  disabled = false,
  className,
}: SearchableComboboxProps) {
  // Temukan object terpilih berdasarkan string value
  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === value) ?? null;
  }, [options, value]);

  const [inputValue, setInputValue] = React.useState(selectedOption?.label ?? "");

  // Sinkronisasi input value saat selected option dari luar berubah (misal tombol reset filter)
  React.useEffect(() => {
    setInputValue(selectedOption?.label ?? "");
  }, [selectedOption]);

  // Live filter berdasarkan apa yang diketik user
  const filteredOptions = React.useMemo(() => {
    if (!inputValue.trim()) return options;
    // Jika teks input sama persis dengan yang sedang terpilih, tampilkan semua agar user bisa memilih opsi lain
    if (
      selectedOption &&
      inputValue.trim().toLowerCase() === selectedOption.label.trim().toLowerCase()
    ) {
      return options;
    }
    const q = inputValue.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, inputValue, selectedOption]);

  return (
    <Combobox<SearchableComboboxOption>
      value={selectedOption}
      inputValue={inputValue}
      onInputValueChange={(val) => setInputValue(val)}
      onValueChange={(val) => {
        if (val && typeof val === "object" && "value" in val) {
          onValueChange(val.value);
          setInputValue(val.label);
        } else if (!val) {
          onValueChange("");
          setInputValue("");
        }
      }}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder={placeholder}
        disabled={disabled}
        className={cn("w-full h-8 text-xs", className)}
      />
      <ComboboxContent align="start" className="w-(--anchor-width) z-50">
        <ComboboxList>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((item) => (
              <ComboboxItem
                key={item.value}
                value={item}
                className="text-xs cursor-pointer"
              >
                {item.label}
              </ComboboxItem>
            ))
          ) : (
            <div className="py-3 px-2 text-center text-xs text-muted-foreground">
              {emptyText}
            </div>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
