export type ActionState<TData = unknown> = {
  success: boolean;
  data?: TData;
  error?: string;
};
