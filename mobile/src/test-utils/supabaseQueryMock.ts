type QueryResult = { data: unknown; error: { message: string } | null };

const BUILDER_METHODS = [
  "select",
  "insert",
  "update",
  "delete",
  "eq",
  "order",
  "single",
] as const;

export type QueryBuilderMock = Record<
  (typeof BUILDER_METHODS)[number],
  jest.Mock
> &
  PromiseLike<QueryResult>;

// Fake Supabase query builder: every method (select, eq, order…) returns the
// builder itself, so calls can be chained, and awaiting it gives `result`.
export function createQueryBuilderMock(result: QueryResult): QueryBuilderMock {
  const builder = {} as QueryBuilderMock;
  for (const method of BUILDER_METHODS) {
    builder[method] = jest.fn(() => builder);
  }
  builder.then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}
