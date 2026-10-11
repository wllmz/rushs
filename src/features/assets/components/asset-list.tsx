import { formatFileSize } from "../file-rules";
import type { AssetSummary } from "../queries";
import { DeleteAssetButton } from "./delete-asset-button";

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
          <span className="truncate font-medium">{asset.title}</span>
          <span className="flex shrink-0 flex-wrap items-center gap-3 text-sm text-foreground/60">
            <span>{KIND_LABELS[asset.kind]}</span>
            <span>V{asset.latestVersion.number}</span>
            <span>{formatFileSize(asset.latestVersion.sizeBytes)}</span>
            <span>{dateFormat.format(new Date(asset.createdAt))}</span>
            {asset.createdBy === currentUserId && (
              <DeleteAssetButton projectId={projectId} assetId={asset.id} title={asset.title} />
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
