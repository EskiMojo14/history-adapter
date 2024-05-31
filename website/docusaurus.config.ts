import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const organizationName = "EskiMojo14";
const projectName = "history-adapter";
/**
 * Creates magic comments from a map of names to classes (or pass `true` for a key to use `code-block-${name}-line` as the class)
 */
const makeMagicComments = (classMap: Record<string, string | true>) =>
  Object.entries(classMap).map(([name, className]) => ({
    className: className === true ? `code-block-${name}-line` : className,
    line: `${name}-next-line`,
    block: { start: `${name}-start`, end: `${name}-end` },
  }));

const config: Config = {
  title: "History Adapter",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: `https://${organizationName}.github.io`,
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: `/${projectName}`,

  trailingSlash: false,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName, // Usually your GitHub org/user name.
  projectName, // Usually your repo name.
  deploymentBranch: "gh-pages",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  plugins: ["docusaurus-plugin-sass"],

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          editUrl: `https://github.com/${organizationName}/${projectName}/tree/main/website`,
        },
        blog: false,
        theme: {
          customCss: "./src/scss/global.scss",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "History Adapter",
      logo: {
        src: "img/logo.png",
      },

      items: [
        {
          href: `https://github.com/${organizationName}/${projectName}`,
          className: "header-github-link",
          "aria-label": "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Inspired by",
          items: [
            {
              label: "createEntityAdapter",
              href: "https://redux-toolkit.js.org/api/createEntityAdapter",
            },
            {
              label: "Discussion with @medihack",
              href: "https://github.com/reduxjs/redux-toolkit/discussions/4020",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Ben Durrant. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      magicComments: makeMagicComments({
        highlight: "theme-code-block-highlighted-line",
        error: true,
        success: true,
        "ts-only": true,
        "js-only": true,
      }),
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
