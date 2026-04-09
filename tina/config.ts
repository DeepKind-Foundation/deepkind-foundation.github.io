import { defineConfig } from "tinacms";

export default defineConfig({
  branch: process.env.GITHUB_BRANCH || "main",
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || null,
  token: process.env.TINA_TOKEN || null,

  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },

  media: {
    tina: {
      mediaRoot: "img",
      publicFolder: "public",
    },
  },

  schema: {
    collections: [
      {
        name: "siteContent",
        label: "Site Content",
        path: "src/data",
        format: "json",
        ui: {
          allowedActions: { create: false, delete: false },
        },
        match: { include: "content" },
        fields: [
          // ── Navigation ────────────────────────────────
          {
            type: "object",
            name: "navigation",
            label: "Navigation",
            fields: [
              {
                type: "object",
                name: "links",
                label: "Links",
                list: true,
                ui: { itemProps: (item) => ({ label: item?.name }) },
                fields: [
                  { type: "string", name: "name", label: "Label" },
                  { type: "string", name: "url",  label: "URL" },
                ],
              },
              {
                type: "object",
                name: "cta",
                label: "CTA Button",
                fields: [
                  { type: "string", name: "label", label: "Label" },
                  { type: "string", name: "href",  label: "URL" },
                ],
              },
            ],
          },

          // ── Hero ──────────────────────────────────────
          {
            type: "object",
            name: "hero",
            label: "Hero",
            fields: [
              { type: "string", name: "protocol",       label: "Protocol tag" },
              { type: "string", name: "titlePrefix",    label: "Title — prefix" },
              { type: "string", name: "titleHighlight", label: "Title — highlight word" },
              { type: "string", name: "titleSuffix",    label: "Title — suffix" },
              { type: "string", name: "description",    label: "Description", ui: { component: "textarea" } },
              { type: "string", name: "cta",            label: "Primary CTA label" },
              {
                type: "object",
                name: "secondaryCta",
                label: "Secondary CTA",
                fields: [
                  { type: "string", name: "label", label: "Label" },
                  { type: "string", name: "href",  label: "URL" },
                ],
              },
              {
                type: "object",
                name: "stats",
                label: "Stats",
                list: true,
                ui: { itemProps: (item) => ({ label: item?.label }) },
                fields: [
                  { type: "string", name: "value", label: "Value" },
                  { type: "string", name: "label", label: "Label" },
                ],
              },
            ],
          },

          // ── Bento ─────────────────────────────────────
          {
            type: "object",
            name: "bento",
            label: "Bento (Areas of Action)",
            fields: [
              { type: "string", name: "header",   label: "Section header" },
              { type: "string", name: "protocol", label: "Protocol tag" },
              {
                type: "object",
                name: "areas",
                label: "Areas",
                list: true,
                ui: { itemProps: (item) => ({ label: item?.title }) },
                fields: [
                  { type: "string", name: "id",          label: "ID" },
                  { type: "string", name: "tag",         label: "Tag" },
                  { type: "string", name: "title",       label: "Title" },
                  { type: "string", name: "description", label: "Description", ui: { component: "textarea" } },
                  {
                    type: "string",
                    name: "variant",
                    label: "Variant",
                    options: ["wide", "standard", "lead"],
                  },
                  {
                    type: "string",
                    name: "accent",
                    label: "Accent colour",
                    options: ["violet", "mint", "coral", "gold", "rose"],
                  },
                ],
              },
            ],
          },

          // ── About ─────────────────────────────────────
          {
            type: "object",
            name: "about",
            label: "About",
            fields: [
              { type: "string", name: "header",   label: "Section header" },
              { type: "string", name: "protocol", label: "Protocol tag" },
              { type: "string", name: "status",   label: "Status tag" },
              { type: "string", name: "title",    label: "Title" },
              {
                type: "string",
                name: "paragraphs",
                label: "Paragraphs",
                list: true,
                ui: { component: "textarea" },
              },
            ],
          },

          // ── Projects ──────────────────────────────────
          {
            type: "object",
            name: "projects",
            label: "Projects",
            fields: [
              { type: "string", name: "header",   label: "Section header" },
              { type: "string", name: "protocol", label: "Protocol tag" },
              {
                type: "object",
                name: "items",
                label: "Projects",
                list: true,
                ui: { itemProps: (item) => ({ label: item?.title }) },
                fields: [
                  { type: "string", name: "title",       label: "Title" },
                  { type: "string", name: "category",    label: "Category" },
                  { type: "string", name: "description", label: "Description", ui: { component: "textarea" } },
                  { type: "image",  name: "image",       label: "Image" },
                  { type: "string", name: "cta",         label: "CTA label" },
                  { type: "string", name: "url",         label: "URL" },
                  {
                    type: "string",
                    name: "accent",
                    label: "Accent colour",
                    options: ["violet", "mint", "coral", "gold", "rose"],
                  },
                ],
              },
            ],
          },

          // ── Support ───────────────────────────────────
          {
            type: "object",
            name: "support",
            label: "Support / Join",
            fields: [
              { type: "string", name: "header",  label: "Section header" },
              { type: "string", name: "subtext", label: "Subtext", ui: { component: "textarea" } },
              {
                type: "object",
                name: "options",
                label: "Options",
                list: true,
                ui: { itemProps: (item) => ({ label: item?.title }) },
                fields: [
                  { type: "string", name: "title",       label: "Title" },
                  { type: "string", name: "description", label: "Description", ui: { component: "textarea" } },
                  { type: "string", name: "cta",         label: "CTA label" },
                  { type: "string", name: "url",         label: "URL" },
                  { type: "string", name: "theme",       label: "Theme" },
                ],
              },
            ],
          },

          // ── Footer ────────────────────────────────────
          {
            type: "object",
            name: "footer",
            label: "Footer",
            fields: [
              { type: "string", name: "description", label: "Tagline" },
              { type: "string", name: "copyright",   label: "Copyright" },
              { type: "string", name: "location",    label: "Location tag" },
              {
                type: "object",
                name: "legal",
                label: "Legal links",
                list: true,
                ui: { itemProps: (item) => ({ label: item?.name }) },
                fields: [
                  { type: "string", name: "name", label: "Label" },
                  { type: "string", name: "url",  label: "URL" },
                ],
              },
              {
                type: "object",
                name: "connect",
                label: "Connect links",
                list: true,
                ui: { itemProps: (item) => ({ label: item?.name }) },
                fields: [
                  { type: "string", name: "name", label: "Label" },
                  { type: "string", name: "url",  label: "URL" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
});
