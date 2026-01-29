import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Mousetrap from "mousetrap";
import * as GQL from "src/core/generated-graphql";
import { useConfigurationContext } from "src/hooks/Config";
import { ListFilterModel } from "src/models/list-filter/filter";
import { PathCriterion } from "src/models/list-filter/criteria/path";
import { useFindImages } from "src/core/StashService";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";
import { ErrorMessage } from "src/components/Shared/ErrorMessage";
import { ImageCardGrid } from "src/components/Images/ImageCardGrid";
import { DirectoryTree } from "./DirectoryTree";
import { LibraryInspector } from "./LibraryInspector";
import {
  getAncestorPaths,
  getBreadcrumbs,
  getParentPath,
} from "./LibraryPathUtils";

const LEFT_MIN_WIDTH = 200;
const RIGHT_MIN_WIDTH = 260;
const CENTER_MIN_WIDTH = 360;

type DraggingSide = "left" | "right" | null;

interface DragState {
  side: DraggingSide;
  startX: number;
  leftWidth: number;
  rightWidth: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const arraysEqual = (a?: string[], b?: string[]) => {
  if (!a || !b) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
};

const Library: React.FC = () => {
  const { configuration } = useConfigurationContext();
  const roots = useMemo(
    () => configuration?.general.stashes.map((stash) => stash.path) ?? [],
    [configuration]
  );

  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  const [selectedImageId, setSelectedImageId] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [childrenByPath, setChildrenByPath] = useState<
    Record<string, string[] | undefined>
  >({});

  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(360);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedPath && roots.length > 0) {
      setSelectedPath(roots[0]);
      setExpandedPaths(new Set(roots));
    }
  }, [roots, selectedPath]);

  const filter = useMemo(() => {
    if (!selectedPath) {
      return undefined;
    }
    const nextFilter = new ListFilterModel(GQL.FilterMode.Images);
    const pathCriterion = nextFilter.makeCriterion("path") as PathCriterion;
    pathCriterion.value = selectedPath;
    nextFilter.criteria = [pathCriterion];
    nextFilter.itemsPerPage = 80;
    return nextFilter;
  }, [selectedPath]);

  const { data, loading, error } = useFindImages(filter);
  const images = data?.findImages?.images ?? [];

  useEffect(() => {
    if (images.length === 0) {
      setSelectedImageId(undefined);
      setSelectedIds(new Set());
      return;
    }

    const stillSelected = images.find((image) => image.id === selectedImageId);
    if (!stillSelected) {
      setSelectedImageId(images[0].id);
      setSelectedIds(new Set([images[0].id]));
    }
  }, [images, selectedImageId]);

  const breadcrumbs = useMemo(() => {
    if (!selectedPath) {
      return [];
    }
    return getBreadcrumbs(selectedPath);
  }, [selectedPath]);

  const handleSelectPath = useCallback((path: string) => {
    setSelectedPath(path);
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      getAncestorPaths(path).forEach((ancestor) => next.add(ancestor));
      return next;
    });
  }, []);

  const handleTogglePath = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleChildrenLoaded = useCallback(
    (path: string, children: string[]) => {
      setChildrenByPath((prev) => {
        if (arraysEqual(prev[path], children)) {
          return prev;
        }
        return { ...prev, [path]: children };
      });
    },
    []
  );

  const visiblePaths = useMemo(() => {
    const result: string[] = [];

    const traverse = (path: string) => {
      result.push(path);
      if (expandedPaths.has(path)) {
        const children = childrenByPath[path] ?? [];
        children.forEach((child) => traverse(child));
      }
    };

    roots.forEach((root) => traverse(root));
    return result;
  }, [childrenByPath, expandedPaths, roots]);

  const moveSelection = useCallback(
    (offset: number) => {
      if (visiblePaths.length === 0) {
        return;
      }
      const currentIndex = selectedPath
        ? visiblePaths.indexOf(selectedPath)
        : -1;
      const fallbackIndex = currentIndex === -1 ? 0 : currentIndex;
      const nextIndex = clamp(
        fallbackIndex + offset,
        0,
        visiblePaths.length - 1
      );
      setSelectedPath(visiblePaths[nextIndex]);
    },
    [selectedPath, visiblePaths]
  );

  const handleSelectChange = useCallback(
    (id: string, selected: boolean) => {
      if (selected) {
        setSelectedImageId(id);
        setSelectedIds(new Set([id]));
      } else {
        setSelectedImageId(undefined);
        setSelectedIds(new Set());
      }
    },
    []
  );

  const handlePreview = useCallback(
    (index: number) => {
      const image = images[index];
      if (image) {
        setSelectedImageId(image.id);
        setSelectedIds(new Set([image.id]));
      }
    },
    [images]
  );

  const startDrag = useCallback(
    (side: DraggingSide) => (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragState({
        side,
        startX: event.clientX,
        leftWidth,
        rightWidth,
      });
    },
    [leftWidth, rightWidth]
  );

  useEffect(() => {
    if (!dragState || !containerRef.current) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const delta = event.clientX - dragState.startX;
      const containerWidth = containerRef.current?.clientWidth ?? 0;
      if (dragState.side === "left") {
        const maxLeft = Math.max(
          LEFT_MIN_WIDTH,
          containerWidth - RIGHT_MIN_WIDTH - CENTER_MIN_WIDTH
        );
        setLeftWidth(
          clamp(dragState.leftWidth + delta, LEFT_MIN_WIDTH, maxLeft)
        );
      }

      if (dragState.side === "right") {
        const maxRight = Math.max(
          RIGHT_MIN_WIDTH,
          containerWidth - LEFT_MIN_WIDTH - CENTER_MIN_WIDTH
        );
        setRightWidth(
          clamp(dragState.rightWidth - delta, RIGHT_MIN_WIDTH, maxRight)
        );
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState]);

  useEffect(() => {
    Mousetrap.bind("up", () => moveSelection(-1));
    Mousetrap.bind("down", () => moveSelection(1));
    Mousetrap.bind("left", () => {
      if (!selectedPath) {
        return;
      }
      if (expandedPaths.has(selectedPath)) {
        handleTogglePath(selectedPath);
        return;
      }
      const parent = getParentPath(selectedPath);
      if (parent) {
        handleSelectPath(parent);
      }
    });
    Mousetrap.bind("right", () => {
      if (!selectedPath) {
        return;
      }
      if (!expandedPaths.has(selectedPath)) {
        handleTogglePath(selectedPath);
        return;
      }
      const children = childrenByPath[selectedPath] ?? [];
      if (children.length > 0) {
        handleSelectPath(children[0]);
      }
    });
    Mousetrap.bind("enter", () => {
      if (!selectedPath) {
        return;
      }
      handleTogglePath(selectedPath);
    });

    return () => {
      Mousetrap.unbind("up");
      Mousetrap.unbind("down");
      Mousetrap.unbind("left");
      Mousetrap.unbind("right");
      Mousetrap.unbind("enter");
    };
  }, [
    childrenByPath,
    expandedPaths,
    handleSelectPath,
    handleTogglePath,
    moveSelection,
    selectedPath,
  ]);

  return (
    <div className="library-layout" ref={containerRef}>
      <div className="library-pane library-pane-left" style={{ width: leftWidth }}>
        <div className="library-pane-header">Library</div>
        <DirectoryTree
          roots={roots}
          expandedPaths={expandedPaths}
          selectedPath={selectedPath}
          childrenByPath={childrenByPath}
          onSelectPath={handleSelectPath}
          onTogglePath={handleTogglePath}
          onChildrenLoaded={handleChildrenLoaded}
        />
      </div>
      <div className="library-splitter" onMouseDown={startDrag("left")} />
      <div className="library-pane library-pane-center">
        <div className="library-pane-header">
          <div className="library-breadcrumbs">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                <button
                  type="button"
                  className="library-breadcrumb"
                  onClick={() => handleSelectPath(crumb.path)}
                >
                  {crumb.label}
                </button>
                {index < breadcrumbs.length - 1 && (
                  <span className="library-breadcrumb-separator">/</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="library-pane-body">
          {loading && <LoadingIndicator />}
          {error && (
            <ErrorMessage
              message="Failed to load images"
              error={error.message}
            />
          )}
          {!loading && !error && (
            <ImageCardGrid
              images={images}
              selectedIds={selectedIds}
              zoomIndex={filter?.zoomIndex ?? 1}
              onSelectChange={handleSelectChange}
              onPreview={(index) => handlePreview(index)}
            />
          )}
          {!loading && !error && images.length === 0 && (
            <div className="library-empty">No images found in this directory.</div>
          )}
        </div>
      </div>
      <div className="library-splitter" onMouseDown={startDrag("right")} />
      <div
        className="library-pane library-pane-right"
        style={{ width: rightWidth }}
      >
        <div className="library-pane-header">Inspector</div>
        <div className="library-pane-body">
          {selectedImageId ? (
            <LibraryInspector imageId={selectedImageId} />
          ) : (
            <div className="library-empty">Select an image to inspect.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Library;
