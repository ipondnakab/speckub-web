import { expect, it } from "vitest";
import { pathTree } from "./path-tree";
it("groups shared paths, keeps parent endpoints and separates methods", () => {
  const input = [
    { id: "users.create", method: "POST", path: "/api/users" },
    { id: "users.read", method: "GET", path: "/api/users/{id}" },
    { id: "health", method: "GET", path: "/" },
    { id: "users.list", method: "GET", path: "/api/users" },
    { id: "users2.list", method: "GET", path: "/api/users2" },
  ];
  const root = pathTree(input);
  const api = root.children.get("api")!;
  const users = api.children.get("users")!;
  expect(root.endpoints.map((e) => e.id)).toEqual(["health"]);
  expect(api.count).toBe(4);
  expect(users.count).toBe(3);
  expect(users.endpoints.map((e) => e.method)).toEqual(["GET", "POST"]);
  expect(users.children.get("{id}")?.endpoints[0].id).toBe("users.read");
  expect(api.children.has("users2")).toBe(true);
  expect(input[0].id).toBe("users.create");
});
it("retains meaningful empty segments rather than merging distinct routes", () => {
  const tree = pathTree([
    { id: "a", method: "GET", path: "/api//users" },
    { id: "b", method: "GET", path: "/api/users/" },
  ]);
  expect(
    tree.children.get("api")?.children.get("")?.children.get("users")
      ?.endpoints[0].id,
  ).toBe("a");
  expect(
    tree.children.get("api")?.children.get("users")?.children.get("")
      ?.endpoints[0].id,
  ).toBe("b");
});
