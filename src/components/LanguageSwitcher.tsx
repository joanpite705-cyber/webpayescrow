import { LANGUAGES, setUserLanguage, useLanguage } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

interface Props {
  onChange?: () => void;
  compact?: boolean;
}

export default function LanguageSwitcher({ onChange, compact }: Props) {
  const { lang } = useLanguage();
  const currentLang = LANGUAGES.find((l) => l.code === lang);

  const handleChange = (v: string) => {
    setUserLanguage(v);
    onChange?.();
  };

  return (
    <div className="flex items-center gap-1.5">
      {!compact && <Globe className="h-4 w-4 text-muted-foreground" />}
      <Select value={lang} onValueChange={handleChange}>
        <SelectTrigger className={compact ? "w-20 h-8 text-xs gap-1" : "w-36 h-9 text-sm gap-1.5"}>
          <span className="flex items-center gap-1.5">
            {compact ? (
              <span>{currentLang?.flag || "🌐"}</span>
            ) : (
              <>
                <span>{currentLang?.flag || "🌐"}</span>
                <SelectValue />
              </>
            )}
          </span>
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              <span className="flex items-center gap-2">
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
