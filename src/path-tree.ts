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
