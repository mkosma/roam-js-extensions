import { AppProps } from "next/app";
import { ThemeProvider } from "@dvargas92495/ui";
import React from "react";
import { MDXProvider } from "@mdx-js/react";
import { ClerkProvider } from "@clerk/clerk-react";
import FeatureFlagProvider from "../components/FeatureFlagProvider";
import "../components/global.css";
import "normalize.css/normalize.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import useTawkTo from "../components/tawkto";
import components from "../components/MdxComponents";

const MDXProviderWrapper: React.FunctionComponent<{ pathname: string }> = ({
  pathname,
  children,
}) => {
  return pathname === "/extensions/[id]" ? (
    <>{children}</>
  ) : (
    <MDXProvider components={components}>{children}</MDXProvider>
  );
};

const MyApp = ({ Component, pageProps, router }: AppProps): JSX.Element => {
  useTawkTo();
  return (
    <ClerkProvider frontendApi={process.env.NEXT_PUBLIC_CLERK_FRONTEND_API}>
      <ThemeProvider>
        <MDXProviderWrapper pathname={router.pathname}>
          <FeatureFlagProvider>
            <Component {...pageProps} />
          </FeatureFlagProvider>
        </MDXProviderWrapper>
      </ThemeProvider>
    </ClerkProvider>
  );
};

export default MyApp;
