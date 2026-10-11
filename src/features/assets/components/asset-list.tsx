import Link from "next/link";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { deleteAsset } from "../actions";
import { formatFileSize } from "../file-rules";
import type { AssetSummary } from "../queries";

const KIND_LABELS = { video: "Vidéo", image: "Image" } as const;
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

type AssetListProps = {
  projectId: string;
  assets: AssetSummary[];
  currentUserId: string;
};

export function AssetList({ projectId, assets, currentUserId }: AssetListProps) {
  if (assets.length === 0) {
    return <p className="text-sm text-foreground/60">Aucun rush pour l&apos;instant.</p>;
  }

  return (
    <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
      {assets.map((asset) => (
        <li
          key={asset.id}
          className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <Link
            href={`/projects/${projectId}/assets/${asset.id}`}
            className="truncate font-medium hover:underline"
          >
            {asset.title}
          </Link>
          <span className="flex shrink-0 flex-wrap items-center gap-3 text-sm text-foreground/60">
            <span>{KIND_LABELS[asset.kind]}</span>
            <span>V{asset.latestVersion.number}</span>
            <span>{formatFileSize(asset.latestVersion.sizeBytes)}</span>
            <span>{dateFormat.format(new Date(asset.createdAt))}</span>
            {asset.createdBy === currentUserId && (
              <ConfirmDeleteButton
                action={deleteAsset.bind(null, { projectId, assetId: asset.id })}
                label={`Supprimer ${asset.title}`}
              />
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
