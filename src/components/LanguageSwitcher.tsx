import { LANGUAGES, getUserLanguage, setUserLanguage } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

interface Props {
  onChange?: () => void;
  compact?: boolean;
}

export default function LanguageSwitcher({ onChange, compact }: Props) {
  const lang = getUserLanguage();

  const handleChange = (v: string) => {
    setUserLanguage(v);
    onChange?.();
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2">
      {!compact && <Globe className="h-4 w-4 text-muted-foreground" />}
      <Select value={lang} onValueChange={handleChange}>
        <SelectTrigger className={compact ? "w-16 h-8 text-xs" : "w-28 h-9 text-sm"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
