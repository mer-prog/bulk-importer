import { Button, InlineStack } from "@shopify/polaris";
import { useTranslation, type Locale } from "../i18n/i18nContext";

export function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <InlineStack gap="100" align="center" blockAlign="center">
      <Button
        size="micro"
        variant={locale === "en" ? "primary" : "tertiary"}
        onClick={() => setLocale("en" as Locale)}
      >
        {t("language.en")}
      </Button>
      <Button
        size="micro"
        variant={locale === "ja" ? "primary" : "tertiary"}
        onClick={() => setLocale("ja" as Locale)}
      >
        {t("language.ja")}
      </Button>
    </InlineStack>
  );
}
