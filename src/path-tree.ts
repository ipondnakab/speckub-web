export interface PathEndpoint {
  id: string;
  path: string;
  method: string;
}
export interface PathBranch<T extends PathEndpoint> {
  segment: string;
  path: string;
  children: Map<string, PathBranch<T>>;
  endpoints: T[];
  count: number;
}
export function pathTree<T extends PathEndpoint>(
  endpoints: T[],
): PathBranch<T> {
  const root: PathBranch<T> = {
    segment: "",
    path: "",
    children: new Map(),
    endpoints: [],
    count: 0,
  };
  for (const endpoint of [...endpoints].sort(
    (a, b) =>
      a.path.localeCompare(b.path) ||
      a.method.localeCompare(b.method) ||
      a.id.localeCompare(b.id),
  )) {
    let branch = root;
    branch.count++;
    const segments =
      endpoint.path === "/" ? [] : endpoint.path.slice(1).split("/");
    for (const segment of segments) {
      const path = branch.path + "/" + segment;
      let child = branch.children.get(segment);
      if (!child) {
        child = { segment, path, children: new Map(), endpoints: [], count: 0 };
        branch.children.set(segment, child);
      }
      branch = child;
      branch.count++;
    }
    branch.endpoints.push(endpoint);
  }
  return root;
}

export function branchEndpoints<T extends PathEndpoint>(
  branch: PathBranch<T>,
): T[] {
  const endpoints: T[] = [];
  const pending = [branch];
  while (pending.length) {
    const current = pending.pop()!;
    endpoints.push(...current.endpoints);
    pending.push(...current.children.values());
  }
  return endpoints.sort(
    (a, b) =>
      a.path.localeCompare(b.path) ||
      a.method.localeCompare(b.method) ||
      a.id.localeCompare(b.id),
  );
}

export function navigationLabel(path: string, prefix = ""): string {
  const relative = prefix ? path.slice(prefix.length) || "/" : path;
  const segments = relative.slice(1).split("/");
  if (segments.length <= 4) return relative;
  const tail = segments.slice(-2).join("/");
  return prefix
    ? "…/" + tail
    : "/" + segments.slice(0, 2).join("/") + "/…/" + tail;
}
