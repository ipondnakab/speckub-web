"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { openRepo, loadBranch, type Repo } from "../../../src/github";

type BranchData = Awaited<ReturnType<typeof loadBranch>>;
export type ReaderSnapshot = BranchData & {
  repo: Repo;
  branches: string[];
  branch: string;
  selected: string;
};
type Target = {
  repo: Repo;
  branches: string[];
  branch: string;
  selected: string;
  warning?: string;
};
type Notice = { message: string; kind: "loading" | "warning" | "error" };

export function useReader() {
  const router = useRouter();
  const queryString = useSearchParams().toString();
  const [snapshot, setSnapshot] = useState<ReaderSnapshot | null>(null);
  const [notice, setNotice] = useState<Notice>({
    message: "",
    kind: "loading",
  });
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState(
    () => new URLSearchParams(queryString).get("repo") ?? "",
  );
  const [observedQuery, setObservedQuery] = useState(queryString);
  if (observedQuery !== queryString) {
    setObservedQuery(queryString);
    const value = new URLSearchParams(queryString).get("repo") ?? "";
    if (!value) {
      setSnapshot(null);
      setInput("");
      setBusy(false);
      setNotice({ message: "", kind: "loading" });
    } else if (snapshot?.repo.full !== value) setInput(value);
  }

  const active = useRef<ReaderSnapshot | null>(null);
  const controller = useRef<AbortController | null>(null);

  const commit = useCallback(
    (next: ReaderSnapshot) => {
      active.current = next;
      setSnapshot(next);
      const query = new URLSearchParams({
        repo: next.repo.full,
        branch: next.branch,
      });
      if (next.selected) query.set("endpoint", next.selected);
      router.replace(`/explorer?${query}`, { scroll: false });
    },
    [router],
  );

  const start = useCallback(() => {
    controller.current?.abort();
    controller.current = new AbortController();
    setBusy(true);
    return controller.current.signal;
  }, []);

  const read = useCallback(
    async (target: Target, signal: AbortSignal, refresh = false) => {
      setNotice({ message: `Loading ${target.branch}…`, kind: "loading" });
      const result = await loadBranch(
        target.repo,
        target.branch,
        signal,
        (message) => {
          if (!signal.aborted) setNotice({ message, kind: "loading" });
        },
        { refresh },
      );
      signal.throwIfAborted();
      const selected = result.specs.some((s) => s.id === target.selected)
        ? target.selected
        : (result.specs[0]?.id ?? "");
      commit({
        ...result,
        repo: target.repo,
        branches: target.branches,
        branch: target.branch,
        selected,
      });
      const message = result.warning || target.warning || "";
      setNotice({ message, kind: message ? "warning" : "loading" });
    },
    [commit],
  );

  const connect = useCallback(
    async (
      value: string,
      requestedState?: { branch: string | null; selected: string | null },
    ) => {
      const signal = start();
      setNotice({ message: "Opening repository…", kind: "loading" });
      try {
        const result = await openRepo(
          value.replace(/^github\.com\//, "https://github.com/"),
          signal,
        );
        signal.throwIfAborted();
        const previous = active.current;
        const sameRepo = result.repo.full === previous?.repo.full;
        const requested = requestedState
          ? requestedState.branch
          : sameRepo
            ? previous.branch
            : null;
        await read(
          {
            ...result,
            branch:
              requested && result.branches.includes(requested)
                ? requested
                : result.repo.defaultBranch,
            selected: requestedState
              ? (requestedState.selected ?? "")
              : sameRepo
                ? previous.selected
                : "",
          },
          signal,
        );
      } catch (error) {
        if (!signal.aborted)
          setNotice({
            kind: "error",
            message: `${error instanceof Error ? error.message : "Unable to open repository."}${active.current ? " Your previously loaded documentation is still available." : ""}`,
          });
      } finally {
        if (!signal.aborted) setBusy(false);
      }
    },
    [start, read],
  );

  const readBranch = useCallback(
    async (branch?: string, refresh = false) => {
      const previous = active.current;
      if (!previous) return;
      const signal = start();
      try {
        await read(
          {
            ...previous,
            branch: branch ?? previous.branch,
            warning: undefined,
          },
          signal,
          refresh,
        );
      } catch (error) {
        if (!signal.aborted)
          setNotice({
            kind: "error",
            message: `${error instanceof Error ? error.message : "Could not load branch."} Still showing ${previous.repo.full} on branch ${previous.branch}.`,
          });
      } finally {
        if (!signal.aborted) setBusy(false);
      }
    },
    [start, read],
  );

  const select = useCallback(
    (selected: string) => {
      if (active.current) commit({ ...active.current, selected });
    },
    [commit],
  );

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    const value = params.get("repo") ?? "";
    const previous = active.current;
    if (!value) {
      controller.current?.abort();
      active.current = null;
      return;
    }
    const branch = params.get("branch");
    const selected = params.get("endpoint");
    if (
      previous?.repo.full === value &&
      previous.branch === (branch ?? previous.repo.defaultBranch)
    ) {
      const desired = previous.specs.some((spec) => spec.id === selected)
        ? selected!
        : (previous.specs[0]?.id ?? "");
      if (desired !== previous.selected) select(desired);
      return;
    }
    void connect(value, { branch, selected });
  }, [queryString, connect, select]);

  useEffect(() => () => controller.current?.abort(), []);

  return {
    snapshot,
    notice,
    busy,
    input,
    setInput,
    connect,
    readBranch,
    select,
  };
}
