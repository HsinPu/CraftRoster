export type Component = Readonly<{
  id: string;
  title: string;
  status: "active" | "maintenance";
}>;

export const catalog: readonly Component[] = Object.freeze([
  Object.freeze({ id: "roster", title: "Team roster", status: "active" as const }),
  Object.freeze({ id: "calendar", title: "Shared calendar", status: "maintenance" as const }),
]);
