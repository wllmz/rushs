import { useId } from "react";

type RushFileInputProps = { accept: string; hint: string };

// Read by the parent form through FormData, under the name "file"
export function RushFileInput({ accept, hint }: RushFileInputProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        Fichier
      </label>
      <input
        id={id}
        name="file"
        type="file"
        accept={accept}
        required
        className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-foreground/10 file:px-3 file:py-2 file:text-sm file:font-medium"
      />
      <p className="text-xs text-foreground/60">{hint}</p>
    </div>
  );
}
