"use client";

import { useSyncExternalStore } from "react";
import {
  loadNavigation,
  saveNavigation,
  type NavigationPreferences,
} from "../../../src/navigation-preferences";

const defaults = JSON.stringify({ view: "list", depth: 2 });
let snapshot: string | undefined;
const listeners = new Set<() => void>();
const getSnapshot = () => (snapshot ??= JSON.stringify(loadNavigation()));
const getServerSnapshot = () => defaults;

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = () => {
    snapshot = undefined;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function updateNavigation(next: NavigationPreferences) {
  snapshot = JSON.stringify(next);
  saveNavigation(next);
  for (const listener of listeners) listener();
}

export function useNavigationPreferences() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    preferences: JSON.parse(value) as NavigationPreferences,
    updateNavigation,
  };
}
