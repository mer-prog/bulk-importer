import { Link, Outlet } from "@remix-run/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { Box, InlineStack } from "@shopify/polaris";
import { useTranslation } from "../i18n/i18nContext";
import { LanguageToggle } from "./LanguageToggle";

export function AppContent() {
  const { t } = useTranslation();

  return (
    <>
      <NavMenu>
        <Link to="/app" rel="home">
          {t("app.navHome")}
        </Link>
        <Link to="/app/history">{t("app.navHistory")}</Link>
      </NavMenu>
      <div style={{ position: "fixed", top: 8, right: 16, zIndex: 100 }}>
        <LanguageToggle />
      </div>
      <Outlet />
    </>
  );
}
