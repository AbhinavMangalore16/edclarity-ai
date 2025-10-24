declare module "humanize-duration" {
  export default function humanizeDuration(
    ms: number,
    options?: {
      language?: string;
      delimiter?: string;
      spacer?: string;
      units?: string[];
      round?: boolean;
      conjunction?: string;
      serialComma?: boolean;
      largest?: number;
    }
  ): string;
}
