import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { deleteVersion } from "@/features/assets/actions";
import { AddVersionForm } from "@/features/assets/components/add-version-form";
import { PlayerProvider, RushImage, RushVideo } from "@/features/assets/components/player";
import { ReviewStatusButtons } from "@/features/assets/components/review-status-buttons";
import { StatusBadge } from "@/features/assets/components/status-badge";
import { formatFileSize } from "@/features/assets/file-rules";
import { getAsset, getRushUrl } from "@/features/assets/queries";
import { pickVersion } from "@/features/assets/versions";
import { getCurrentUser } from "@/features/auth/queries";
import { CommentForm } from "@/features/comments/components/comment-form";
import { CommentList } from "@/features/comments/components/comment-list";
import { listComments } from "@/features/comments/queries";
import { getProject } from "@/features/projects/queries";
import { LiveAssetUpdates } from "@/features/realtime/components/live-asset-updates";
import { formatDate } from "@/lib/format-date";

type AssetPageProps = PageProps<"/projects/[projectId]/assets/[assetId]">;

async function loadAsset(projectId: string, assetId: string) {
  // A malformed id would make Postgres throw: treat it as a missing asset
  if (!z.uuid().safeParse(assetId).success) notFound();
  const asset = await getAsset(assetId);
  // An asset reached through another project's url is not found either
  if (!asset || asset.projectId !== projectId) notFound();
  return asset;
}

export async function generateMetadata({ params }: AssetPageProps): Promise<Metadata> {
  const { projectId, assetId } = await params;
  const asset = await loadAsset(projectId, assetId);
  return { title: `${asset.title} · Rushs` };
}

const KIND_LABELS = { video: "Vidéo", image: "Image" } as const;

export default async function AssetPage({ params, searchParams }: AssetPageProps) {
  const { projectId, assetId } = await params;
  const asset = await loadAsset(projectId, assetId);
  const version = pickVersion(asset.versions, (await searchParams).v);
  // An asset is always registered with its first version
  if (!version) notFound();

  // The asset is readable, so the project is too: only the role is missing
  const [project, url, user, comments] = await Promise.all([
    getProject(projectId),
    getRushUrl(version.storagePath),
    getCurrentUser(),
    listComments(version.id),
  ]);
  if (!project) notFound();
  // The database also refuses the last version and reviewed or commented ones: the button only avoids offering them
  const canDeleteVersions = project.myRole === "editor" && asset.versions.length > 1;

  return (
    // The comments read and move the time of the video
    <PlayerProvider>
      <LiveAssetUpdates assetId={assetId} versionId={version.id} />
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Link href={`/projects/${projectId}`} className="text-sm text-foreground/60 hover:text-foreground">
            ← {project.name}
          </Link>
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{asset.title}</h1>
            <span className="text-sm text-foreground/60">
              {KIND_LABELS[asset.kind]} · V{version.number}
            </span>
            <StatusBadge status={version.status} />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-foreground/10 bg-foreground/5">
          {asset.kind === "video" ? (
            // key: switching versions loads the new source instead of keeping the old one
            <RushVideo
              key={version.number}
              src={url}
              controls
              aria-label={`${asset.title}, version ${version.number}`}
              className="max-h-[70vh] w-full"
            />
          ) : (
            <RushImage
              key={version.number}
              src={url}
              alt={`${asset.title}, version ${version.number}`}
              className="max-h-[70vh] w-full object-contain"
            />
          )}
        </div>

        <section aria-labelledby="review-heading" className="flex flex-col gap-3">
          <h2 id="review-heading" className="font-medium">
            Validation de la V{version.number}
          </h2>
          {version.reviewedAt && (
            <p className="text-sm text-foreground/60">
              {`Statut posé par ${version.reviewerName ?? "un compte inconnu"} le ${formatDate(version.reviewedAt)}.`}
            </p>
          )}
          {project.myRole === "reviewer" ? (
            <ReviewStatusButtons
              // key: a confirmation shown for one version must not stay on the next one
              key={version.number}
              projectId={projectId}
              assetId={assetId}
              number={version.number}
              status={version.status}
            />
          ) : (
            !version.reviewedAt && <p className="text-sm text-foreground/60">En attente d&apos;un validateur.</p>
          )}
        </section>

        <section aria-labelledby="comments-heading" className="flex flex-col gap-4">
          <h2 id="comments-heading" className="font-medium">
            Commentaires sur la V{version.number}
          </h2>
          <CommentList comments={comments} />
          <CommentForm
            // key: a draft or an error written for one version must not stay on the next one
            key={version.number}
            projectId={projectId}
            assetId={assetId}
            versionId={version.id}
            isVideo={asset.kind === "video"}
          />
        </section>

        <section aria-labelledby="versions-heading" className="flex flex-col gap-4">
          <h2 id="versions-heading" className="font-medium">
            Versions
          </h2>
          <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10">
            {asset.versions.map((item) => {
              const current = item.number === version.number;
              return (
                <li
                  key={item.number}
                  className={`flex items-center gap-2 pr-3 ${current ? "bg-foreground/5" : ""}`}
                >
                  <Link
                    href={`/projects/${projectId}/assets/${assetId}?v=${item.number}`}
                    aria-current={current ? "true" : undefined}
                    className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 hover:bg-foreground/5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium">V{item.number}</span>
                      <StatusBadge status={item.status} />
                    </span>
                    <span className="flex flex-wrap gap-3 text-sm text-foreground/60">
                      <span>{item.uploaderName ?? "Auteur inconnu"}</span>
                      <span>{formatFileSize(item.sizeBytes)}</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </span>
                  </Link>
                  {canDeleteVersions && item.uploadedBy === user.id && item.reviewedAt === null && item.commentCount === 0 && (
                    <ConfirmDeleteButton
                      action={deleteVersion.bind(null, { projectId, assetId, number: item.number })}
                      label={`Supprimer la version ${item.number}`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          {project.myRole === "editor" && (
            <div className="rounded-lg border border-foreground/10 p-4">
              <h3 className="mb-3 text-sm font-medium">Nouvelle version</h3>
              <AddVersionForm projectId={projectId} assetId={assetId} assetKind={asset.kind} />
            </div>
          )}
        </section>
      </div>
    </PlayerProvider>
  );
}
