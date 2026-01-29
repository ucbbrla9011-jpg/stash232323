import React, { useCallback, useEffect } from "react";
import { Icon } from "src/components/Shared/Icon";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";
import { useDirectoryPaths } from "src/components/Shared/FolderSelect/useDirectoryPaths";
import {
  faChevronRight,
  faChevronDown,
  faFolder,
} from "@fortawesome/free-solid-svg-icons";
import { getPathLabel } from "./LibraryPathUtils";

interface DirectoryTreeProps {
  roots: string[];
  expandedPaths: Set<string>;
  selectedPath?: string;
  childrenByPath: Record<string, string[] | undefined>;
  onSelectPath: (path: string) => void;
  onTogglePath: (path: string) => void;
  onChildrenLoaded: (path: string, children: string[]) => void;
}

interface DirectoryNodeProps {
  path: string;
  depth: number;
  expandedPaths: Set<string>;
  selectedPath?: string;
  childrenByPath: Record<string, string[] | undefined>;
  onSelectPath: (path: string) => void;
  onTogglePath: (path: string) => void;
  onChildrenLoaded: (path: string, children: string[]) => void;
}

const DirectoryNodeChildren: React.FC<
  Omit<DirectoryNodeProps, "depth"> & { depth: number }
> = ({
  path,
  depth,
  expandedPaths,
  selectedPath,
  childrenByPath,
  onSelectPath,
  onTogglePath,
  onChildrenLoaded,
}) => {
  const { directories, loading } = useDirectoryPaths(path, true);

  useEffect(() => {
    if (directories) {
      onChildrenLoaded(path, directories);
    }
  }, [directories, onChildrenLoaded, path]);

  if (loading) {
    return (
      <div className="library-tree-loading" style={{ paddingLeft: depth * 16 }}>
        <LoadingIndicator />
      </div>
    );
  }

  if (!directories || directories.length === 0) {
    return null;
  }

  return (
    <div className="library-tree-children">
      {directories.map((directory) => (
        <DirectoryNode
          key={directory}
          path={directory}
          depth={depth}
          expandedPaths={expandedPaths}
          selectedPath={selectedPath}
          childrenByPath={childrenByPath}
          onSelectPath={onSelectPath}
          onTogglePath={onTogglePath}
          onChildrenLoaded={onChildrenLoaded}
        />
      ))}
    </div>
  );
};

const DirectoryNode: React.FC<DirectoryNodeProps> = ({
  path,
  depth,
  expandedPaths,
  selectedPath,
  childrenByPath,
  onSelectPath,
  onTogglePath,
  onChildrenLoaded,
}) => {
  const isExpanded = expandedPaths.has(path);
  const isSelected = selectedPath === path;
  const label = getPathLabel(path);
  const children = childrenByPath[path];
  const hasChildren = children ? children.length > 0 : true;

  const handleToggle = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onTogglePath(path);
    },
    [onTogglePath, path]
  );

  return (
    <div className="library-tree-node" role="treeitem">
      <div
        className={`library-tree-item ${isSelected ? "is-selected" : ""}`}
        style={{ paddingLeft: depth * 16 }}
        onClick={() => onSelectPath(path)}
      >
        <button
          className="library-tree-toggle"
          onClick={handleToggle}
          aria-label={isExpanded ? "Collapse directory" : "Expand directory"}
          aria-expanded={isExpanded}
          type="button"
          disabled={!hasChildren}
        >
          <Icon icon={isExpanded ? faChevronDown : faChevronRight} />
        </button>
        <Icon icon={faFolder} className="library-tree-folder" />
        <span className="library-tree-label">{label}</span>
      </div>
      {isExpanded && (
        <DirectoryNodeChildren
          path={path}
          depth={depth + 1}
          expandedPaths={expandedPaths}
          selectedPath={selectedPath}
          childrenByPath={childrenByPath}
          onSelectPath={onSelectPath}
          onTogglePath={onTogglePath}
          onChildrenLoaded={onChildrenLoaded}
        />
      )}
    </div>
  );
};

export const DirectoryTree: React.FC<DirectoryTreeProps> = ({
  roots,
  expandedPaths,
  selectedPath,
  childrenByPath,
  onSelectPath,
  onTogglePath,
  onChildrenLoaded,
}) => {
  return (
    <div className="library-tree" role="tree">
      {roots.map((root) => (
        <DirectoryNode
          key={root}
          path={root}
          depth={0}
          expandedPaths={expandedPaths}
          selectedPath={selectedPath}
          childrenByPath={childrenByPath}
          onSelectPath={onSelectPath}
          onTogglePath={onTogglePath}
          onChildrenLoaded={onChildrenLoaded}
        />
      ))}
    </div>
  );
};
