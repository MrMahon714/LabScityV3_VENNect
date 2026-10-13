"use client";

import {
  Avatar,
  Card,
  createTheme,
  CSSVariablesResolver,
} from "@mantine/core";

export const theme = createTheme({
  fontFamily: "Inter, sans-serif",
  colors: {
    navy: [
      "#EFF4F6",
      "#E7F0F8",
      "#D8E0E8",
      "#CFE1F1",
      "#9CC3E2",
      "#6AA4D3",
      "#2B6CA3",
      "#07386A",
      "#07386A",
      "#07386A",
    ],
    dark: [
      "#c9d3f5", "#b4c0e8", "#8391be", "#66749f", "#2a3563",
      "#232d58", "#0f1638", "#0a0e28", "#070a1e", "#04061a",
    ],
    gray: [
      "#FFFFFF",
      "#F8F9FA",
      "#EFF4F6",
      "#D8E0E8",
      "#C1C9D1",
      "#646D77",
      "#4F6A87",
      "#4A5F7A",
      "#364A5C",
      "#2A3A47",
    ],
  },
  primaryColor: "navy",
  primaryShade: { light: 7, dark: 6 },
  defaultRadius: "md",
  components: {
    Card: Card.extend({
      defaultProps: {
        bd: "1px solid gray.3",
        shadow: "xs",
        bg: "gray.0",
      },
    }),
    Avatar: Avatar.extend({
      defaultProps: {
        color: "navy.6",
        bg: "var(--ls-navy-tint)",
      },
    }),
  },
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-text":           "var(--mantine-color-navy-7)",
    "--mantine-color-body":           "#EFF4F6",
    "--mantine-color-default-border": "#D8E0E8",
    "--mantine-color-default":        "#FFFFFF",

    "--ls-surface":        "#FFFFFF",
    "--ls-surface-alt":    "#F8FAFC",
    "--ls-bg-soft":        "#EEF3F9",
    "--ls-border":         "#E5E7EB",
    "--ls-app-bg":         "#EFF4F6",
    "--ls-empty-bg":       "#CFE1F1",
    "--ls-accent":         "#2B6CA3",
    "--ls-topbar":         "#07386A",
    "--ls-topbar-border":  "#D8E0E8", // topbar border
    "--ls-topbar-shadow":  "none", // topbar shadow
    "--ls-search-bg":      "#F8F9FA", // searchbar background
    "--ls-search-border":  "transparent", // searchbar border
    "--ls-search-focus":   "#6AA4D3", // searchbar focus border
    "--ls-icon-badge-bg":    "#CFE1F1", // group icon circle background
    "--ls-icon-badge-color": "#07386A", // group icon circle icon
    "--ls-groups-rail-bg":    "#EFF4F6", // groups page sidebar background
    "--ls-groups-content-bg": "#FFFFFF", // groups page content background
    "--ls-chat-bg":           "linear-gradient(180deg, #F8FAFC 0%, #EEF3F9 100%)", // messages page background
    "--ls-chat-rail-bg":      "#F8FAFC", // messages page sidebar background
    "--ls-brand":          "#1F3A5F",
    "--ls-navy-tint":      "#E7F0F8",
    "--ls-navy-tint-0":    "#EFF4F6",
    "--ls-tint-bg":        "#EFF6FF",
    "--ls-tint-bg-2":      "#EEF2FF",
    "--ls-tint-border":    "#BFDBFE",
    "--ls-tint-text":      "#1D4ED8",
    "--ls-text-strong":    "#123257",
    "--ls-text-body":      "#475569",
    "--ls-text-muted":     "#64748B",
  },
  dark: {
    "--mantine-color-text":           "#d6e0ff",
    "--mantine-color-body":           "#050917",
    "--mantine-color-default-border": "rgba(120,160,255,0.16)",
    "--mantine-color-default":        "#0c1230",
    "--mantine-color-dimmed":         "#8392be",
    "--mantine-color-placeholder":    "#8392be",
    "--mantine-color-navy-6":         "#7fb2dd",
    "--mantine-color-navy-filled":    "#2B6CA3",
    "--mantine-primary-color-filled": "#2B6CA3",

    "--mantine-color-gray-0": "#0c1230",
    "--mantine-color-gray-1": "#101838",
    "--mantine-color-gray-2": "#151e44",
    "--mantine-color-gray-3": "#222c58",
    "--mantine-color-gray-4": "#6f7eaf",
    "--mantine-color-gray-5": "#7886b3",
    "--mantine-color-gray-6": "#8f9cc6",
    "--mantine-color-gray-7": "#aab5d8",
    "--mantine-color-gray-8": "#c5cee8",
    "--mantine-color-gray-9": "#e6ecff",

    "--mantine-color-gray-light":         "rgba(120,160,255,0.10)",
    "--mantine-color-gray-light-hover":   "rgba(120,160,255,0.16)",
    "--mantine-color-gray-light-color":   "#c5cee8",
    "--mantine-color-gray-outline":       "#c5cee8",
    "--mantine-color-gray-outline-hover": "rgba(120,160,255,0.08)",

    "--ls-surface":        "#0c1230",
    "--ls-surface-alt":    "#090e26",
    "--ls-bg-soft":        "#0a0f24",
    "--ls-app-bg":         "transparent",
    "--ls-empty-bg":       "#0c1230",
    "--ls-accent":         "#2B6CA3",
    "--ls-topbar":         "rgba(17,27,70,0.92)", // topbar background
    "--ls-topbar-border":  "rgba(140,175,255,0.30)", // topbar border
    "--ls-topbar-shadow":  "0 6px 24px rgba(0,0,0,0.55)", // topbar shadow
    "--ls-search-bg":      "#1a2656", // searchbar background
    "--ls-search-border":  "rgba(150,185,255,0.35)", // searchbar border
    "--ls-search-focus":   "#7fb2dd", // searchbar focus border
    "--ls-icon-badge-bg":    "rgba(70,130,220,0.28)", // group icon circle background
    "--ls-icon-badge-color": "#93c5fd", // group icon circle icon
    "--ls-groups-rail-bg":    "transparent", // groups page sidebar background
    "--ls-groups-content-bg": "transparent", // groups page content background
    "--ls-chat-bg":           "transparent", // messages page background
    "--ls-chat-rail-bg":      "transparent", // messages page sidebar background
    "--ls-border":         "rgba(120,160,255,0.16)",
    "--ls-brand":          "#2f5aa6",
    "--ls-navy-tint":      "rgba(70,130,220,0.20)",
    "--ls-navy-tint-0":    "rgba(70,130,220,0.12)",
    "--ls-tint-bg":        "rgba(56,120,220,0.14)",
    "--ls-tint-bg-2":      "rgba(99,102,241,0.16)",
    "--ls-tint-border":    "rgba(119, 174, 240, 0.35)",
    "--ls-tint-text":      "#93c5fd",
    "--ls-text-strong":    "#e6ecff",
    "--ls-text-body":      "#b9c5ea",
    "--ls-text-muted":     "#7f8fba",
  },
});
